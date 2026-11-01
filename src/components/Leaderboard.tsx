import type { TeamRow } from '../lib/backend'
import { pay } from '../lib/format'

export function Leaderboard({
  entries,
  onBonus,
}: {
  entries: { team: TeamRow; points: number }[]
  /** Host only: the CEO's bonus and penalty buttons. */
  onBonus?: (teamId: string, delta: 10 | -10) => void
}) {
  const max = Math.max(1, ...entries.map((e) => e.points))
  // Bars start at zero; a negative total shows an empty bar.
  return (
    <div className="space-y-3">
      <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-slate-500">
        CFO pay · performance bonus
      </h2>
      {entries.length === 0 && <p className="text-center text-slate-500">No teams yet.</p>}
      {entries.map((e, i) => (
        <div key={e.team.id} className="flex items-center gap-4">
          <span className={`w-8 text-right text-2xl font-bold ${i === 0 ? 'text-gold' : 'text-slate-400'}`}>
            {i + 1}
          </span>
          <span className="w-40 truncate text-lg font-semibold">
            {e.team.name}
            {!!e.team.bonus && (
              <span className={`block text-xs font-normal ${e.team.bonus > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                incl. CEO {e.team.bonus > 0 ? 'bonus' : 'penalty'} {pay(e.team.bonus)}
              </span>
            )}
          </span>
          <div className="h-10 min-w-16 flex-1 overflow-hidden rounded-xl bg-slate-100">
            <div
              className={`bar h-full rounded-xl ${i === 0 ? 'bg-gold' : 'bg-navy'}`}
              style={{ transform: `scaleX(${Math.max(0, e.points) / max})`, transitionDelay: `${i * 60}ms` }}
            />
          </div>
          <span className="w-36 text-right text-xl font-bold tabular-nums">{pay(e.points)}</span>
          {onBonus && (
            <span className="no-print flex shrink-0 gap-1">
              <button
                onClick={() => onBonus(e.team.id, 10)}
                title="CEO bonus: +€10k"
                className="rounded-lg bg-emerald-600 px-2.5 py-1 text-sm font-bold text-white"
              >
                +10k
              </button>
              <button
                onClick={() => onBonus(e.team.id, -10)}
                title="CEO penalty: −€10k"
                className="rounded-lg bg-red-600 px-2.5 py-1 text-sm font-bold text-white"
              >
                −10k
              </button>
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
