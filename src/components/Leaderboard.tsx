import type { TeamRow } from '../lib/backend'
import { eurm } from '../lib/format'

export function Leaderboard({
  entries,
  onBonus,
}: {
  entries: { team: TeamRow; points: number }[]
  /** Host only: shows the captain's bonus buttons. */
  onBonus?: (teamId: string, delta: 10 | -10) => void
}) {
  const max = Math.max(1, ...entries.map((e) => e.points))
  // Bars start at zero; a negative total shows an empty bar.
  return (
    <div className="space-y-3">
      <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-slate-500">
        Value created for Lufthansa
      </h2>
      {entries.length === 0 && <p className="text-center text-slate-500">No teams yet.</p>}
      {entries.map((e, i) => (
        <div key={e.team.id} className="flex items-center gap-4">
          <span className={`w-8 text-right text-2xl font-bold ${i === 0 ? 'text-gold' : 'text-slate-400'}`}>
            {i + 1}
          </span>
          <span className="w-40 truncate text-lg font-semibold">
            {e.team.name}
            {(e.team.bonus ?? 0) > 0 && (
              <span className="block text-xs font-normal text-slate-500">incl. captain’s bonus {eurm(e.team.bonus!, 0)}</span>
            )}
          </span>
          <div className="h-10 min-w-16 flex-1 overflow-hidden rounded-xl bg-slate-100">
            <div
              className={`bar h-full rounded-xl ${i === 0 ? 'bg-gold' : 'bg-navy'}`}
              style={{ transform: `scaleX(${Math.max(0, e.points) / max})`, transitionDelay: `${i * 60}ms` }}
            />
          </div>
          <span className="w-36 text-right text-xl font-bold tabular-nums">{eurm(e.points, Number.isInteger(e.points) ? 0 : 2)}</span>
          {onBonus && (
            <span className="no-print flex shrink-0 gap-1">
              <button
                onClick={() => onBonus(e.team.id, 10)}
                title="Captain’s bonus"
                className="rounded-lg bg-gold px-2.5 py-1 text-sm font-bold text-navy"
              >
                +10 ✈
              </button>
              <button
                onClick={() => onBonus(e.team.id, -10)}
                disabled={!e.team.bonus}
                title="Undo bonus"
                className="rounded-lg bg-slate-100 px-2 py-1 text-sm text-slate-500 disabled:opacity-30"
              >
                −10
              </button>
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
