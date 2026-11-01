import { useServerNow } from '../hooks/useClock'

export function Timer({ end, className = '' }: { end: string | null; className?: string }) {
  const now = useServerNow()
  if (!end) return null
  const left = Math.max(0, Math.ceil((new Date(end).getTime() - now) / 1000))
  const mm = Math.floor(left / 60)
  const ss = String(left % 60).padStart(2, '0')
  const tone = left === 0 ? 'bg-red-600 text-white' : left <= 30 ? 'bg-amber-400 text-navy' : 'bg-white/15 text-white'
  return (
    <span className={`rounded-lg px-3 py-1 font-mono font-bold tabular-nums ${tone} ${className}`}>
      {left === 0 ? "Time's up" : `${mm}:${ss}`}
    </span>
  )
}
