export type RoundState = 'locked' | 'open' | 'event' | 'revealed' | 'finished'

export interface GameRow {
  id: string
  code: string
  current_round: number
  round_state: RoundState
  timer_end: string | null
  show_leaderboard: boolean
  revealed_rounds: number[]
  event_rounds: number[]
  created_at: string
}

export interface TeamRow {
  id: string
  game_id: string
  name: string
  /** CEO bonus (+) or penalty (−) from the host, in points; missing until the bonus migration has run. */
  bonus?: number
  created_at: string
}

export interface AnswerRow {
  id: string
  game_id: string
  team_id: string
  round: number
  task_id: string
  value: string
  created_at: string
}

export interface Snapshot {
  game: GameRow | null
  teams: TeamRow[]
  answers: AnswerRow[]
}

export type HostAction = 'unlock' | 'event' | 'reveal' | 'goto' | 'timer' | 'leaderboard' | 'finish'

export interface NewAnswer {
  game_id: string
  team_id: string
  round: number
  task_id: string
  value: string
}

export interface Backend {
  mode: 'supabase' | 'local'
  serverNow(): Promise<number>
  checkPin(pin: string): Promise<boolean>
  createGame(pin: string): Promise<GameRow>
  findGame(code: string): Promise<GameRow | null>
  hostAction(gameId: string, pin: string, action: HostAction, arg?: number): Promise<void>
  /** CEO bonus or penalty: delta is +10 or −10; the total may go negative. */
  bonus(gameId: string, pin: string, teamId: string, delta: 10 | -10): Promise<void>
  joinTeam(code: string, name: string): Promise<TeamRow>
  /** Resolves silently if this task was already submitted (answers are locked). */
  submitAnswer(answer: NewAnswer): Promise<void>
  load(gameId: string): Promise<Snapshot>
  subscribe(gameId: string, onChange: () => void): () => void
}
