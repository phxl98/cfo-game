-- CFO Game schema. Run once in Supabase: SQL Editor -> paste -> Run.
-- Then set the host PIN (last statement) to something only you know.

create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  current_round int not null default 0,
  round_state text not null default 'locked'
    check (round_state in ('locked', 'open', 'event', 'revealed', 'finished')),
  timer_end timestamptz,
  show_leaderboard boolean not null default false,
  revealed_rounds int[] not null default '{}',
  event_rounds int[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 30),
  bonus int not null default 0,
  created_at timestamptz not null default now()
);
create unique index if not exists teams_game_name on teams (game_id, lower(name));

create table if not exists answers (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  round int not null,
  task_id text not null,
  value text not null check (char_length(value) <= 500),
  created_at timestamptz not null default now(),
  unique (team_id, task_id)
);

create table if not exists host_secret (pin text primary key);

-- Row level security: everyone may read games/teams/answers, teams may only insert
-- answers while their round is open. Every other write goes through the functions below.
alter table games enable row level security;
alter table teams enable row level security;
alter table answers enable row level security;
alter table host_secret enable row level security; -- no policies: unreadable for clients

drop policy if exists "read games" on games;
create policy "read games" on games for select using (true);
drop policy if exists "read teams" on teams;
create policy "read teams" on teams for select using (true);
drop policy if exists "read answers" on answers;
create policy "read answers" on answers for select using (true);
drop policy if exists "submit while open" on answers;
create policy "submit while open" on answers for insert with check (
  exists (
    select 1 from games g join teams t on t.game_id = g.id
    where g.id = answers.game_id and t.id = answers.team_id
      and g.current_round = answers.round and g.round_state in ('open', 'event')
  )
);

create or replace function server_now() returns timestamptz
language sql stable as $$ select now() $$;

create or replace function check_pin(p_pin text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from host_secret where pin = p_pin)
$$;

create or replace function create_game(p_pin text) returns games
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
  v_game games;
begin
  if not check_pin(p_pin) then raise exception 'Wrong PIN'; end if;
  loop
    select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ', 1 + floor(random() * 24)::int, 1), '')
      into v_code from generate_series(1, 4);
    exit when not exists (select 1 from games where code = v_code);
  end loop;
  insert into games (code) values (v_code) returning * into v_game;
  return v_game;
end $$;

create or replace function join_team(p_code text, p_name text) returns teams
language plpgsql security definer set search_path = public as $$
declare
  v_game_id uuid;
  v_name text := btrim(p_name);
  v_team teams;
begin
  select id into v_game_id from games where code = upper(btrim(p_code));
  if v_game_id is null then raise exception 'No game with code %', upper(btrim(p_code)); end if;
  insert into teams (game_id, name) values (v_game_id, v_name)
    on conflict (game_id, lower(name)) do nothing;
  select * into v_team from teams where game_id = v_game_id and lower(name) = lower(v_name);
  return v_team;
end $$;

create or replace function host_action(p_game uuid, p_pin text, p_action text, p_arg int default null)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not check_pin(p_pin) then raise exception 'Wrong PIN'; end if;
  case p_action
    when 'unlock' then
      update games set round_state = 'open' where id = p_game;
    when 'event' then
      update games set round_state = 'event',
        event_rounds = array_append(array_remove(event_rounds, current_round), current_round)
        where id = p_game;
    when 'reveal' then
      update games set round_state = 'revealed', timer_end = null,
        revealed_rounds = array_append(array_remove(revealed_rounds, current_round), current_round)
        where id = p_game;
    when 'goto' then
      update games set current_round = p_arg, timer_end = null,
        round_state = case when p_arg = any(revealed_rounds) then 'revealed' else 'locked' end
        where id = p_game;
    when 'timer' then
      update games set timer_end =
        case when coalesce(p_arg, 0) > 0 then now() + make_interval(secs => p_arg) end
        where id = p_game;
    when 'leaderboard' then
      update games set show_leaderboard = not show_leaderboard where id = p_game;
    when 'finish' then
      update games set round_state = 'finished', show_leaderboard = false, timer_end = null
        where id = p_game;
    else
      raise exception 'Unknown action %', p_action;
  end case;
end $$;

create or replace function host_bonus(p_game uuid, p_pin text, p_team uuid, p_delta int)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not check_pin(p_pin) then raise exception 'Wrong PIN'; end if;
  if p_delta not in (10, -10) then raise exception 'Bonus must be +10 or -10'; end if;
  update teams set bonus = greatest(0, bonus + p_delta) where id = p_team and game_id = p_game;
end $$;

grant execute on function host_bonus(uuid, text, uuid, int) to anon, authenticated;
grant execute on function server_now(), check_pin(text), create_game(text),
  join_team(text, text), host_action(uuid, text, text, int) to anon, authenticated;

-- Realtime: push row changes to the browsers.
do $$
begin
  alter publication supabase_realtime add table games, teams, answers;
exception when duplicate_object then null;
end $$;

-- Host PIN. Change it, then run this statement again whenever you want a new one.
delete from host_secret;
insert into host_secret (pin) values ('CHANGE-ME');
