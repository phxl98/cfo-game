import type { RouteState } from '../content/types'

const tone: Record<RouteState['status'], string> = {
  approved: 'bg-emerald-100 text-emerald-800',
  preliminary: 'bg-emerald-50 text-emerald-700',
  hedged: 'bg-sky-100 text-sky-800',
  'under review': 'bg-amber-100 text-amber-900',
  rejected: 'bg-red-100 text-red-800',
}

/** The long haul route carried through rounds 2 to 5, updated after each reveal. */
export function RouteBar({ route, className = '' }: { route: RouteState; className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 ${className}`}>
      <span className="font-semibold text-navy">Long haul route</span>
      <span>
        <span className="text-slate-500">Hurdle </span>
        <b className="tabular-nums">{route.hurdle}</b>
      </span>
      <span>
        <span className="text-slate-500">NPV </span>
        <b className="tabular-nums">{route.npv}</b>
      </span>
      <span className={`rounded-full px-2.5 py-0.5 text-[0.8em] font-semibold ${tone[route.status]}`}>{route.status}</span>
    </div>
  )
}
