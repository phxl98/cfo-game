import { rounds } from '../content/rounds'
import type { Round, Task } from '../content/types'
import type { AnswerRow, TeamRow } from './backend/types'
import { parseNumber } from './format'

const EPS = 1e-9

export function defaultTolerance(task: Task): number {
  if (task.type !== 'numeric') return 0
  return task.tolerance ?? (task.unit === '€ m' ? 0.5 : 0.05)
}

/** For % tasks, "0.0714" is read as 7.14% when that is the closer reading. */
export function numericDistance(task: Task, value: number, target = task.type === 'numeric' ? task.answer : 0): number {
  if (task.type !== 'numeric') return Infinity
  const d = Math.abs(value - target)
  return task.unit === '%' ? Math.min(d, Math.abs(value * 100 - target)) : d
}

/** The alternative a numeric answer matches, if it earns more there than against the main answer. */
export function alternativeHit(task: Task, value: string | undefined) {
  if (task.type !== 'numeric' || value === undefined || !task.alternatives) return undefined
  const n = parseNumber(value)
  if (n === null) return undefined
  const main = closeness(task, n, task.answer) * 10
  return task.alternatives.find((a) => closeness(task, n, a.answer) * a.points > main)
}

/** 1 within tolerance, 0.5 within 3 × tolerance, else 0. */
function closeness(task: Task, n: number, target: number): number {
  const d = numericDistance(task, n, target)
  const tol = defaultTolerance(task)
  if (d <= tol + EPS) return 1
  if (d <= 3 * tol + EPS) return 0.5
  return 0
}

export const isDecision = (task: Task) => (task.type === 'choice' || task.type === 'multivote') && !!task.decision

/** Value a decision creates for Lufthansa in € m: the picked options' values. */
export function decisionValue(task: Task, value: string | undefined): number {
  if (value === undefined || !isDecision(task) || (task.type !== 'choice' && task.type !== 'multivote')) return 0
  const ids = task.type === 'multivote' ? parseMulti(value) : [value]
  return task.options.filter((o) => ids.includes(o.id)).reduce((sum, o) => sum + (o.value ?? 0), 0)
}

/** Best value a decision can create. */
export function bestDecisionValue(task: Task): number {
  if (!isDecision(task) || (task.type !== 'choice' && task.type !== 'multivote')) return 0
  const values = task.options.map((o) => o.value ?? 0)
  return task.type === 'multivote' ? values.filter((v) => v > 0).reduce((a, b) => a + b, 0) : Math.max(0, ...values)
}

export function parseChecklist(value: string): Record<string, boolean> {
  try {
    const v = JSON.parse(value)
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}

export function parseMulti(value: string): string[] {
  try {
    const v = JSON.parse(value)
    return Array.isArray(v) ? v.map(String) : []
  } catch {
    return []
  }
}

export function scoreTask(task: Task, value: string | undefined): number {
  if (value === undefined) return 0
  switch (task.type) {
    case 'numeric': {
      const n = parseNumber(value)
      if (n === null) return 0
      const alt = alternativeHit(task, value)
      return alt ? Math.round(closeness(task, n, alt.answer) * alt.points) : closeness(task, n, task.answer) * 10
    }
    case 'choice':
      return task.decision ? 0 : (task.options.find((o) => o.id === value)?.points ?? 0)
    case 'checklist': {
      const picked = parseChecklist(value)
      return task.items.filter((i) => picked[i.id] === i.include).length * 2
    }
    case 'discussion':
    case 'multivote':
      return 0
  }
}

export function maxPoints(task: Task): number {
  switch (task.type) {
    case 'numeric':
      return 10
    case 'choice':
      return task.decision ? 0 : Math.max(...task.options.map((o) => o.points))
    case 'checklist':
      return task.items.length * 2
    case 'discussion':
    case 'multivote':
      return 0
  }
}

/** Tasks a team sees in a round: main tasks, plus event tasks once the event was triggered. */
export function visibleTasks(round: Round, eventOn: boolean): Task[] {
  return eventOn && round.event ? [...round.tasks, ...round.event.tasks] : round.tasks
}

const taskIndex = new Map<string, Task>(
  rounds.flatMap((r) => [...r.tasks, ...(r.event?.tasks ?? [])].map((t) => [t.id, t] as const)),
)

export const taskById = (id: string) => taskIndex.get(id)

/** Points and decision values only count once the round has been revealed; the captain's bonus always counts. */
export function teamScore(team: TeamRow, answers: AnswerRow[], revealedRounds: number[]): number {
  const teamId = team.id
  return (team.bonus ?? 0) + answers
    .filter((a) => a.team_id === teamId && revealedRounds.includes(a.round))
    .reduce((sum, a) => {
      const task = taskById(a.task_id)
      return sum + (task ? scoreTask(task, a.value) + decisionValue(task, a.value) : 0)
    }, 0)
}

export function leaderboard(teams: TeamRow[], answers: AnswerRow[], revealedRounds: number[]) {
  return teams
    .map((t) => ({ team: t, points: teamScore(t, answers, revealedRounds) }))
    .sort((a, b) => b.points - a.points || a.team.name.localeCompare(b.team.name))
}
