-- Migration 2: Captain's bonus. Run once in Supabase: SQL Editor -> paste -> Run.
-- Safe to run again.

alter table teams add column if not exists bonus int not null default 0;

create or replace function host_bonus(p_game uuid, p_pin text, p_team uuid, p_delta int)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not check_pin(p_pin) then raise exception 'Wrong PIN'; end if;
  if p_delta not in (10, -10) then raise exception 'Bonus must be +10 or -10'; end if;
  update teams set bonus = greatest(0, bonus + p_delta) where id = p_team and game_id = p_game;
end $$;

grant execute on function host_bonus(uuid, text, uuid, int) to anon, authenticated;
