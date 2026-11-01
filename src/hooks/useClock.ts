import { useEffect, useState } from 'react'
import { backend } from '../lib/backend'

// Difference between the server clock and this device, so every screen shows the same timer.
let offsetMs = 0
let offsetPromise: Promise<void> | null = null

function syncOffset() {
  offsetPromise ??= (async () => {
    try {
      const t0 = Date.now()
      const server = await backend.serverNow()
      const t1 = Date.now()
      offsetMs = server - (t0 + t1) / 2
    } catch {
      offsetPromise = null
    }
  })()
  return offsetPromise
}

/** Server-corrected "now", ticking every `intervalMs`. */
export function useServerNow(intervalMs = 500) {
  const [now, setNow] = useState(() => Date.now() + offsetMs)
  useEffect(() => {
    void syncOffset().then(() => setNow(Date.now() + offsetMs))
    const t = setInterval(() => setNow(Date.now() + offsetMs), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}
