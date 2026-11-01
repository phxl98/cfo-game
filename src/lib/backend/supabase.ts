import { createClient } from '@supabase/supabase-js'
import type { AnswerRow, Backend, GameRow, TeamRow } from './types'

export function supabaseBackend(url: string, key: string): Backend {
  const db = createClient(url, key, { auth: { persistSession: false } })

  const fail = (error: { message: string } | null) => {
    if (error) throw new Error(error.message)
  }

  return {
    mode: 'supabase',

    async serverNow() {
      const { data, error } = await db.rpc('server_now')
      fail(error)
      return new Date(data as string).getTime()
    },

    async checkPin(pin) {
      const { data, error } = await db.rpc('check_pin', { p_pin: pin })
      fail(error)
      return data === true
    },

    async createGame(pin) {
      const { data, error } = await db.rpc('create_game', { p_pin: pin })
      fail(error)
      return data as GameRow
    },

    async findGame(code) {
      const { data, error } = await db.from('games').select('*').eq('code', code.trim().toUpperCase()).maybeSingle()
      fail(error)
      return data as GameRow | null
    },

    async hostAction(gameId, pin, action, arg) {
      const { error } = await db.rpc('host_action', { p_game: gameId, p_pin: pin, p_action: action, p_arg: arg ?? null })
      fail(error)
    },

    async bonus(gameId, pin, teamId, delta) {
      const { error } = await db.rpc('host_bonus', { p_game: gameId, p_pin: pin, p_team: teamId, p_delta: delta })
      fail(error)
    },

    async joinTeam(code, name) {
      const { data, error } = await db.rpc('join_team', { p_code: code, p_name: name })
      fail(error)
      return data as TeamRow
    },

    async submitAnswer(answer) {
      const { error } = await db.from('answers').insert(answer)
      if (error && error.code !== '23505') {
        throw new Error(error.code === '42501' ? 'This round is closed for answers.' : error.message)
      }
    },

    async load(gameId) {
      const [game, teams, answers] = await Promise.all([
        db.from('games').select('*').eq('id', gameId).maybeSingle(),
        db.from('teams').select('*').eq('game_id', gameId).order('created_at'),
        db.from('answers').select('*').eq('game_id', gameId),
      ])
      fail(game.error ?? teams.error ?? answers.error)
      return {
        game: game.data as GameRow | null,
        teams: (teams.data ?? []) as TeamRow[],
        answers: (answers.data ?? []) as AnswerRow[],
      }
    },

    subscribe(gameId, onChange) {
      const channel = db
        .channel(`game-${gameId}-${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` }, onChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'teams', filter: `game_id=eq.${gameId}` }, onChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'answers', filter: `game_id=eq.${gameId}` }, onChange)
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') onChange()
        })
      return () => {
        db.removeChannel(channel)
      }
    },
  }
}
