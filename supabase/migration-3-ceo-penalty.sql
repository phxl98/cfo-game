-- Migration 3: the CEO can also take pay away, so a team's bonus may go below 0.
-- Run once in Supabase: SQL Editor -> paste -> Run. Safe to run again.

create or replace function host_bonus(p_game uuid, p_pin text, p_team uuid, p_delta int)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not check_pin(p_pin) then raise exception 'Wrong PIN'; end if;
  if p_delta not in (10, -10) then raise exception 'Bonus must be +10 or -10'; end if;
  update teams set bonus = bonus + p_delta where id = p_team and game_id = p_game;
end $$;

grant execute on function host_bonus(uuid, text, uuid, int) to anon, authenticated;
