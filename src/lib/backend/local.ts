// Local mode: the whole game lives in this browser's localStorage and syncs across tabs.
// Used when no Supabase keys are configured, for trying the game out and for rehearsals.
import type { AnswerRow, Backend, GameRow, Snapshot, TeamRow } from './types'

export const LOCAL_PIN = '1234'
const KEY = 'cfo-local-db'

interface Db {
  games: GameRow[]
  teams: TeamRow[]
  answers: AnswerRow[]
}

const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('cfo-local') : null

function read(): Db {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '') as Db
  } catch {
    return { games: [], teams: [], answers: [] }
  }
}

function write(db: Db) {
  localStorage.setItem(KEY, JSON.stringify(db))
  channel?.postMessage('changed')
}

const id = () => crypto.randomUUID()
const now = () => new Date().toISOString()
const delay = () => new Promise((r) => setTimeout(r, 30))

function checkPin(pin: string) {
  if (pin !== LOCAL_PIN) throw new Error('Wrong PIN')
}

export function localBackend(): Backend {
  return {
    mode: 'local',

    async serverNow() {
      return Date.now()
    },

    async checkPin(pin) {
      return pin === LOCAL_PIN
    },

    async createGame(pin) {
      checkPin(pin)
      const db = read()
      let code = ''
      do {
        code = Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)]).join('')
      } while (db.games.some((g) => g.code === code))
      const game: GameRow = {
        id: id(),
        code,
        current_round: 0,
        round_state: 'locked',
        timer_end: null,
        show_leaderboard: false,
        revealed_rounds: [],
        event_rounds: [],
        created_at: now(),
      }
      db.games.push(game)
      write(db)
      return game
    },

    async findGame(code) {
      return read().games.find((g) => g.code === code.trim().toUpperCase()) ?? null
    },

    async hostAction(gameId, pin, action, arg) {
      checkPin(pin)
      await delay()
      const db = read()
      const g = db.games.find((x) => x.id === gameId)
      if (!g) throw new Error('Game not found')
      const r = g.current_round
      switch (action) {
        case 'unlock':
          g.round_state = 'open'
          break
        case 'event':
          g.round_state = 'event'
          g.event_rounds = [...g.event_rounds.filter((x) => x !== r), r]
          break
        case 'reveal':
          g.round_state = 'revealed'
          g.timer_end = null
          g.revealed_rounds = [...g.revealed_rounds.filter((x) => x !== r), r]
          break
        case 'goto':
          g.current_round = arg ?? 0
          g.timer_end = null
          g.round_state = g.revealed_rounds.includes(g.current_round) ? 'revealed' : 'locked'
          break
        case 'timer':
          g.timer_end = arg && arg > 0 ? new Date(Date.now() + arg * 1000).toISOString() : null
          break
        case 'leaderboard':
          g.show_leaderboard = !g.show_leaderboard
          break
        case 'finish':
          g.round_state = 'finished'
          g.show_leaderboard = false
          g.timer_end = null
          break
      }
      write(db)
    },

    async bonus(gameId, pin, teamId, delta) {
      checkPin(pin)
      await delay()
      const db = read()
      const team = db.teams.find((t) => t.id === teamId && t.game_id === gameId)
      if (!team) throw new Error('Team not found')
      team.bonus = Math.max(0, (team.bonus ?? 0) + delta)
      write(db)
    },

    async joinTeam(code, rawName) {
      await delay()
      const db = read()
      const game = db.games.find((g) => g.code === code.trim().toUpperCase())
      if (!game) throw new Error(`No game with code ${code.trim().toUpperCase()}`)
      const name = rawName.trim()
      let team = db.teams.find((t) => t.game_id === game.id && t.name.toLowerCase() === name.toLowerCase())
      if (!team) {
        team = { id: id(), game_id: game.id, name, bonus: 0, created_at: now() }
        db.teams.push(team)
        write(db)
      }
      return team
    },

    async submitAnswer(a) {
      await delay()
      const db = read()
      const g = db.games.find((x) => x.id === a.game_id)
      if (!g || g.current_round !== a.round || !['open', 'event'].includes(g.round_state)) {
        throw new Error('This round is closed for answers.')
      }
      if (db.answers.some((x) => x.team_id === a.team_id && x.task_id === a.task_id)) return
      db.answers.push({ ...a, id: id(), created_at: now() })
      write(db)
    },

    async load(gameId): Promise<Snapshot> {
      const db = read()
      return {
        game: db.games.find((g) => g.id === gameId) ?? null,
        teams: db.teams.filter((t) => t.game_id === gameId),
        answers: db.answers.filter((a) => a.game_id === gameId),
      }
    },

    subscribe(_gameId, onChange) {
      const onStorage = (e: StorageEvent) => {
        if (e.key === KEY) onChange()
      }
      window.addEventListener('storage', onStorage)
      channel?.addEventListener('message', onChange)
      return () => {
        window.removeEventListener('storage', onStorage)
        channel?.removeEventListener('message', onChange)
      }
    },
  }
}
