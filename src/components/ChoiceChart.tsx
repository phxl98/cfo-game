import type { ChoiceTask, DiscussionTask, MultiVoteTask } from '../content/types'
import type { AnswerRow, TeamRow } from '../lib/backend'
import { eurm } from '../lib/format'
import { parseMulti } from '../lib/scoring'

/** Which option each team picked. Team names stay hidden until the reveal. */
export function ChoiceChart({
  task,
  answers,
  teams,
  revealed,
}: {
  task: ChoiceTask | DiscussionTask | MultiVoteTask
  answers: AnswerRow[]
  teams: TeamRow[]
  revealed: boolean
}) {
  const picks = answers.filter((a) => a.task_id === task.id)
  const picked = (a: AnswerRow, id: string) => (task.type === 'multivote' ? parseMulti(a.value).includes(id) : a.value === id)
  const max = Math.max(1, ...task.options.map((o) => picks.filter((p) => picked(p, o.id)).length))
  const best = Math.max(...task.options.map((o) => o.points))
  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? '?'

  return (
    <div className="space-y-2">
      {task.options.map((o) => {
        const these = picks.filter((p) => picked(p, o.id))
        const decision = task.type !== 'discussion' && task.decision
        const highlight = revealed && task.type === 'choice' && !decision && o.points === best
        return (
          <div key={o.id}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className={highlight ? 'font-semibold text-emerald-700' : 'text-slate-700'}>
                <b>{o.id.length === 1 ? `${o.id}: ` : ''}</b>
                {o.label}
                {revealed && task.type === 'choice' && !decision && (
                  <span className="ml-2 text-slate-400">({o.points} pts)</span>
                )}
                {revealed && decision && (
                  <span className={`ml-2 font-semibold ${(o.value ?? 0) > 0 ? 'text-emerald-700' : (o.value ?? 0) < 0 ? 'text-red-700' : 'text-slate-500'}`}>
                    {(o.value ?? 0) > 0 ? '+' : ''}
                    {eurm(o.value ?? 0)}
                  </span>
                )}
              </span>
              <span className="font-bold tabular-nums">{these.length}</span>
            </div>
            <div className="mt-1 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`bar h-full rounded-full ${highlight ? 'bg-emerald-500' : 'bg-navy'}`}
                style={{ transform: `scaleX(${these.length / max})` }}
              />
            </div>
            {revealed && these.length > 0 && (
              <p className="mt-1 text-xs text-slate-500">{these.map((p) => teamName(p.team_id)).join(', ')}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
