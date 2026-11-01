import type { ReactNode } from 'react'
import { Brand } from './Brand'
import { Timer } from './Timer'

/** The team screen: one boarding-pass card on Lufthansa blue. */
export function BoardingPass({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-navy px-3 py-4 sm:py-8">
      <div className="mx-auto max-w-xl rounded-3xl bg-white shadow-2xl shadow-black/30">{children}</div>
    </div>
  )
}

export function PassHeader({ round, total, timerEnd }: { round?: number; total: number; timerEnd: string | null }) {
  return (
    <div className="sticky top-0 z-20 flex items-center justify-between gap-3 rounded-t-3xl border-b-4 border-gold bg-navy-light px-5 py-3.5">
      <Brand size="sm" subtitle="CFO Game" />
      <div className="flex items-center gap-3">
        <Timer end={timerEnd} />
        {round !== undefined && (
          <span className="text-right text-[0.65rem] font-semibold uppercase leading-tight tracking-[0.2em] text-white/60">
            Round
            <br />
            <span className="text-base tracking-normal text-white tabular-nums">
              {round}/{total}
            </span>
          </span>
        )}
      </div>
    </div>
  )
}

export function Field({ label, value, className = '' }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="truncate text-lg font-bold text-navy">{value}</p>
    </div>
  )
}

/** Tear line with half-circle notches, like the stub of a boarding pass. */
export function Perforation() {
  return (
    <div className="relative h-5" aria-hidden>
      <span className="absolute top-1/2 -left-2.5 h-5 w-5 -translate-y-1/2 rounded-full bg-navy" />
      <span className="absolute top-1/2 -right-2.5 h-5 w-5 -translate-y-1/2 rounded-full bg-navy" />
      <span className="absolute inset-x-5 top-1/2 border-t-2 border-dashed border-slate-200" />
    </div>
  )
}
