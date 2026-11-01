import { useCallback, useEffect, useRef, useState } from 'react'
import { backend, type Snapshot } from '../lib/backend'

const POLL_MS = 5000

/**
 * Live game state. Realtime pushes trigger a refetch; polling and focus/online refetches
 * cover dropped websockets on bad Wi-Fi.
 */
export function useGame(gameId: string | null) {
  const [snap, setSnap] = useState<Snapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const refreshRef = useRef<() => void>(() => {})

  useEffect(() => {
    if (!gameId) return
    let alive = true
    let inflight = false
    let queued = false

    const run = async () => {
      if (inflight) {
        queued = true
        return
      }
      inflight = true
      try {
        const s = await backend.load(gameId)
        if (alive) {
          setSnap(s)
          setError(null)
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e))
      } finally {
        inflight = false
        if (queued && alive) {
          queued = false
          void run()
        }
      }
    }
    refreshRef.current = () => void run()

    void run()
    const unsubscribe = backend.subscribe(gameId, () => void run())
    const interval = setInterval(() => void run(), POLL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void run()
    }
    const onOnline = () => void run()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)
    return () => {
      alive = false
      unsubscribe()
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
    }
  }, [gameId])

  const refresh = useCallback(() => refreshRef.current(), [])
  return { snap, error, refresh }
}
