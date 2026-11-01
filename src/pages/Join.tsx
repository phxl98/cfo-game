import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Brand, Disclaimer } from '../components/Brand'
import { centralQuestion } from '../content/rounds'
import { TEAM_FONT_SIZE, useRootFontSize } from '../hooks/useRootFontSize'
import { backend } from '../lib/backend'
import { teamSession } from '../lib/storage'

export function Join() {
  const [params] = useSearchParams()
  const existing = teamSession.get()
  const [code, setCode] = useState(params.get('code') ?? existing?.code ?? '')
  const [name, setName] = useState(existing?.name ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  useRootFontSize(TEAM_FONT_SIZE)

  async function join(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const team = await backend.joinTeam(code, name)
      teamSession.set({ teamId: team.id, gameId: team.game_id, name: team.name, code: code.trim().toUpperCase() })
      navigate('/play')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const ready = code.trim().length === 4 && !!name.trim()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-navy px-4 py-10">
      <div className="w-full max-w-md">
        <h1 className="text-center text-3xl font-bold leading-tight text-balance text-white">{centralQuestion}</h1>

        {/* Boarding pass */}
        <form onSubmit={join} className="mt-8 overflow-hidden rounded-3xl bg-white shadow-2xl shadow-black/30">
          <div className="flex items-center justify-between border-b-4 border-gold bg-navy-light px-6 py-4">
            <Brand size="sm" subtitle="Boarding pass" />
            <span className="text-right text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-white/60">
              Class
              <br />
              <span className="text-sm tracking-normal text-white">CFO</span>
            </span>
          </div>

          <div className="space-y-5 px-6 pt-6 pb-5">
            <label className="block">
              <span className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-slate-400">Flight · game code</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={4}
                required
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                placeholder="····"
                className="mt-1 w-full border-b-2 border-slate-200 pb-2 font-mono text-4xl font-bold tracking-[0.35em] text-navy uppercase outline-none placeholder:text-slate-200 focus:border-gold"
              />
            </label>
            <label className="block">
              <span className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-slate-400">Passenger · team name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={30}
                required
                autoComplete="off"
                className="mt-1 w-full border-b-2 border-slate-200 pb-2 text-xl font-semibold text-navy outline-none focus:border-gold"
              />
            </label>
          </div>

          {/* Perforation */}
          <div className="relative h-6">
            <span className="absolute top-1/2 -left-3 h-6 w-6 -translate-y-1/2 rounded-full bg-navy" />
            <span className="absolute top-1/2 -right-3 h-6 w-6 -translate-y-1/2 rounded-full bg-navy" />
            <span className="absolute inset-x-5 top-1/2 border-t-2 border-dashed border-slate-200" />
          </div>

          <div className="px-6 pt-2 pb-6">
            <button
              disabled={busy || !ready}
              className="press-wide w-full rounded-2xl bg-gold py-3.5 text-lg font-bold text-navy disabled:opacity-40"
            >
              {busy ? 'Boarding…' : 'Board as CFO team'}
            </button>
            {error && <p className="mt-3 text-center text-sm text-red-600">{error}</p>}
            <p className="mt-3 text-center text-xs text-slate-400">Same name again = rejoin your team.</p>
          </div>
        </form>

        <Disclaimer className="mt-6 text-center text-white/40" />
      </div>
    </main>
  )
}
