import { useEffect, useState } from 'react'
import { Brand, Disclaimer } from '../components/Brand'
import { ChoiceChart } from '../components/ChoiceChart'
import { DataCard } from '../components/DataCard'
import { Formula } from '../components/Formula'
import { Leaderboard } from '../components/Leaderboard'
import { BreakingNewsFlash } from '../components/BreakingNewsFlash'
import { RouteBar } from '../components/RouteBar'
import { ChecklistTable } from '../components/TaskRow'
import { Timer } from '../components/Timer'
import { centralQuestion, finalAnswer, roundByNumber, rounds, routeStatus, takeaways, taskNumbers } from '../content/rounds'
import type { Task } from '../content/types'
import { useGame } from '../hooks/useGame'
import { useRootFontSize } from '../hooks/useRootFontSize'
import { backend, type AnswerRow, type GameRow, type HostAction, type TeamRow } from '../lib/backend'
import { LOCAL_PIN } from '../lib/backend/local'
import { pay, withUnit } from '../lib/format'
import { leaderboard, maxPoints, pendingEventRound, scoreTask } from '../lib/scoring'
import { hostGame, hostPin } from '../lib/storage'

export function Host() {
  const [pin, setPin] = useState(hostPin.get())
  const [gameId, setGameId] = useState(hostGame.get())

  // Projector mode: scale every rem-based size up.
  useRootFontSize('19px')

  if (!pin) return <PinGate onPin={(p) => (hostPin.set(p), setPin(p))} />
  if (!gameId) return <GameSetup pin={pin} onGame={(id) => (hostGame.set(id), setGameId(id))} />
  return (
    <HostGame
      pin={pin}
      gameId={gameId}
      onLeave={() => {
        hostGame.set(null)
        setGameId(null)
      }}
    />
  )
}

function PinGate({ onPin }: { onPin: (pin: string) => void }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  return (
    <main className="flex min-h-screen items-center justify-center bg-navy px-4">
      <form
        className="w-full max-w-sm space-y-4 rounded-2xl border-t-4 border-gold bg-white p-6"
        onSubmit={async (e) => {
          e.preventDefault()
          setError(null)
          try {
            if (await backend.checkPin(pin)) onPin(pin)
            else setError('Wrong PIN')
          } catch (err) {
            setError(err instanceof Error ? err.message : String(err))
          }
        }}
      >
        <h1 className="text-xl font-bold text-navy">Host login</h1>
        <input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          autoFocus
          placeholder="PIN"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-navy"
        />
        <button className="w-full rounded-xl bg-navy py-3 font-semibold text-white">Enter</button>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {backend.mode === 'local' && (
          <p className="text-xs text-slate-500">Local mode (no Supabase configured): PIN is {LOCAL_PIN}.</p>
        )}
      </form>
    </main>
  )
}

function GameSetup({ pin, onGame }: { pin: string; onGame: (id: string) => void }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const run = async (f: () => Promise<void>) => {
    setError(null)
    try {
      await f()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-navy px-4">
      <div className="w-full max-w-md space-y-4 rounded-2xl border-t-4 border-gold bg-white p-6">
        <h1 className="text-2xl font-bold text-navy">CFO Game · Host</h1>
        <button
          onClick={() => run(async () => onGame((await backend.createGame(pin)).id))}
          className="w-full rounded-xl bg-gold py-3 text-lg font-bold text-navy"
        >
          Create new game
        </button>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void run(async () => {
              const g = await backend.findGame(code)
              if (!g) throw new Error('No game with that code')
              onGame(g.id)
            })
          }}
        >
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={4}
            placeholder="Resume code"
            className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-2 font-mono uppercase outline-none focus:border-navy"
          />
          <button className="rounded-xl border border-navy px-4 font-semibold text-navy">Resume</button>
        </form>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </main>
  )
}

function HostGame({ pin, gameId, onLeave }: { pin: string; gameId: string; onLeave: () => void }) {
  const { snap, error, refresh } = useGame(gameId)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    if (snap && !snap.game) onLeave()
  }, [snap, onLeave])

  if (!snap?.game) {
    return <p className="p-10 text-center text-slate-500">{error ?? 'Loading…'}</p>
  }
  const { game, teams, answers } = snap
  const round = roundByNumber(game.current_round)
  const joinUrl = `${window.location.origin}/?code=${game.code}`

  async function run(f: () => Promise<void>) {
    setBusy(true)
    setActionError(null)
    try {
      await f()
      refresh()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }
  const act = (action: HostAction, arg?: number) => run(() => backend.hostAction(gameId, pin, action, arg))
  const bonus = (teamId: string, delta: 10 | -10) => run(() => backend.bonus(gameId, pin, teamId, delta))

  return (
    <div className="min-h-screen">
      <header className="border-b-4 border-gold bg-navy text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-2 px-6 py-4">
          <Brand />
          <div className="border-l border-white/15 pl-8">
            <p className="text-xs uppercase tracking-widest text-white/60">Join at</p>
            <p className="font-semibold">{joinUrl.replace(/^https?:\/\//, '')}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-white/60">Code</p>
            <p className="font-mono text-4xl font-bold tracking-[0.25em] text-gold">{game.code}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-white/60">Teams</p>
            <p className="text-2xl font-bold">{teams.length}</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Timer end={game.timer_end} className="text-3xl" />
            <button
              onClick={() => act('leaderboard')}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${game.show_leaderboard ? 'bg-gold text-navy' : 'bg-white/10'}`}
            >
              Leaderboard
            </button>
            <button
              onClick={() => confirm('Leave this game? You can resume it with its code.') && onLeave()}
              className="rounded-lg bg-white/10 px-3 py-2 text-sm"
            >
              Leave
            </button>
          </div>
        </div>
      </header>

      <Controls game={game} busy={busy} act={act} />
      {(game.current_round >= 2 || game.round_state === 'finished') && (
        <div className="border-b border-slate-200 bg-slate-50">
          <RouteBar route={routeStatus(game.revealed_rounds, game.event_rounds.filter((n) => n !== pendingEventRound(game)))} className="mx-auto max-w-7xl px-6 py-2 text-lg" />
        </div>
      )}
      {(actionError || error) && (
        <p className="mx-auto mt-3 max-w-7xl rounded-lg bg-red-100 px-6 py-2 text-red-800">{actionError ?? error}</p>
      )}

      <main className="mx-auto max-w-7xl px-6 py-6">
        {game.show_leaderboard ? (
          <div className="mx-auto max-w-4xl rounded-3xl bg-white p-10 shadow-sm">
            <Leaderboard entries={leaderboard(teams, answers, game.revealed_rounds, pendingEventRound(game))} onBonus={bonus} />
          </div>
        ) : game.round_state === 'finished' ? (
          <FinalScreen teams={teams} answers={answers} game={game} onBonus={bonus} />
        ) : !round ? (
          <Lobby teams={teams} joinUrl={joinUrl} code={game.code} />
        ) : (
          <RoundScreen game={game} teams={teams} answers={answers} />
        )}
      </main>
    </div>
  )
}

function Controls({ game, busy, act }: { game: GameRow; busy: boolean; act: (a: HostAction, arg?: number) => void }) {
  const round = roundByNumber(game.current_round)
  const s = game.round_state
  const btn = 'rounded-xl px-4 py-2 font-semibold transition disabled:opacity-30'
  const last = rounds[rounds.length - 1].n
  // A round with breaking news plays it first: "Next round" then brings the news, not the next round.
  const newsPending = !!round?.event && !game.event_rounds.includes(round.n) && s !== 'locked'
  return (
    <div className="no-print border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-6 py-3">
        {round && (
          <>
            <button disabled={busy || s !== 'locked'} onClick={() => act('unlock')} className={`${btn} bg-navy text-white`}>
              Unlock round
            </button>
            <button
              disabled={busy || (s !== 'open' && s !== 'event')}
              onClick={() => act('reveal')}
              className={`${btn} bg-emerald-600 text-white`}
            >
              Reveal answers
            </button>
          </>
        )}
        {game.current_round < last ? (
          <button
            disabled={busy || s === 'finished'}
            onClick={() => (newsPending ? act('event') : act('goto', game.current_round + 1))}
            className={`${btn} border border-navy text-navy`}
          >
            {round ? 'Next round →' : 'Start round 1 →'}
          </button>
        ) : (
          <button
            disabled={busy || s === 'finished'}
            onClick={() => act('finish')}
            className={`${btn} bg-gold text-navy`}
          >
            Final screen →
          </button>
        )}

        <span className="mx-2 h-8 w-px bg-slate-200" />
        <span className="text-sm text-slate-500">Timer</span>
        {[3, 5, 8].map((m) => (
          <button key={m} disabled={busy} onClick={() => act('timer', m * 60)} className={`${btn} bg-slate-100 px-3`}>
            {m}′
          </button>
        ))}
        <button disabled={busy || !game.timer_end} onClick={() => act('timer', 0)} className={`${btn} bg-slate-100 px-3`}>
          ✕
        </button>

        <span className="mx-2 h-8 w-px bg-slate-200" />
        <span className="text-sm text-slate-500">Jump</span>
        {[0, ...rounds.map((r) => r.n)].map((n) => {
          const r = roundByNumber(n)
          const current = n === game.current_round && s !== 'finished'
          return (
            <button
              key={n}
              disabled={busy}
              title={r ? `${r.title}${r.core ? ' (core)' : ' (optional)'}` : 'Lobby'}
              onClick={() => act('goto', n)}
              className={`h-9 w-9 rounded-lg text-sm font-semibold ${
                current ? 'bg-navy text-white' : game.revealed_rounds.includes(n) ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100'
              } ${r && !r.core ? 'italic opacity-70' : ''}`}
            >
              {n === 0 ? '⌂' : n}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Lobby({ teams, joinUrl, code }: { teams: TeamRow[]; joinUrl: string; code: string }) {
  return (
    <div className="py-10 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gold">Each team is a CFO of Lufthansa</p>
      <h1 className="mx-auto mt-4 max-w-4xl text-5xl font-bold leading-tight text-navy">{centralQuestion}</h1>
      <p className="mx-auto mt-4 max-w-3xl text-xl text-slate-600">
        Your bonus depends on getting the numbers right. The CEO is listening: a good argument earns extra, a bad one costs you.
      </p>
      <p className="mt-10 text-2xl text-slate-600">
        Go to <b className="text-navy">{joinUrl.replace(/^https?:\/\//, '').replace(/\/\?code=.*/, '')}</b> and enter code
      </p>
      <p className="mt-2 font-mono text-8xl font-bold tracking-[0.3em] text-navy">{code}</p>
      <div className="mx-auto mt-10 flex max-w-4xl flex-wrap justify-center gap-3">
        {teams.map((t) => (
          <span key={t.id} className="rise-in rounded-full bg-white px-5 py-2 text-xl font-semibold text-navy shadow-sm ring-1 ring-slate-200">
            {t.name}
          </span>
        ))}
        {teams.length === 0 && <span className="text-slate-400">Waiting for teams…</span>}
      </div>
      <Disclaimer className="mt-12 text-slate-400" />
    </div>
  )
}

const stateLabel: Record<GameRow['round_state'], string> = {
  locked: 'Locked: presenters are briefing',
  open: 'Open: teams are calculating',
  event: 'Breaking news: teams react',
  revealed: 'Revealed',
  finished: 'Finished',
}

function RoundScreen({ game, teams, answers }: { game: GameRow; teams: TeamRow[]; answers: AnswerRow[] }) {
  const round = roundByNumber(game.current_round)!
  const eventOn = game.event_rounds.includes(round.n)
  const revealed = game.round_state === 'revealed'
  // During breaking news the round's own tasks stay revealed; only the news tasks are open.
  const mainRevealed = revealed || game.revealed_rounds.includes(round.n)
  const numbers = taskNumbers(round)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-slate-400">
            Round {round.n} of {rounds.length} · {round.chapter} {!round.core && '· optional'}
          </p>
          <h1 className="text-4xl font-bold text-navy">{round.title}</h1>
          <p className="text-xl text-slate-600">{round.question}</p>
        </div>
        <span className="rounded-full bg-slate-200 px-4 py-1.5 font-semibold text-slate-700">{stateLabel[game.round_state]}</span>
      </div>

      {game.round_state === 'event' && round.event && <BreakingNewsFlash title={round.event.title} />}
      {eventOn && round.event && (
        <div className="banner-in rounded-2xl bg-red-600 p-6 text-white shadow-lg">
          <p className="text-sm font-bold uppercase tracking-widest text-white/70">Breaking news</p>
          <p className="mt-1 text-3xl font-bold">{round.event.title}</p>
          <p className="mt-1 text-xl">{round.event.text}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <DataCard round={round} eventOn={eventOn} />
        <div className="divide-y divide-slate-200 self-start rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          {round.tasks.map((t) => (
            <HostTask key={t.id} task={t} label={numbers.get(t.id)!} teams={teams} answers={answers} revealed={mainRevealed} />
          ))}
          {eventOn &&
            round.event?.tasks.map((t) => (
              <HostTask key={t.id} task={t} label={numbers.get(t.id)!} teams={teams} answers={answers} revealed={revealed} event />
            ))}
        </div>
      </div>

      {revealed && (
        <div className="rise-in rounded-2xl bg-navy p-6 text-xl text-white">
          <p className="text-sm font-bold uppercase tracking-widest text-gold">Takeaway</p>
          <p className="mt-1">{round.reveal}</p>
          {eventOn && round.event && <p className="mt-2 text-white/80">{round.event.explanation}</p>}
        </div>
      )}

      {revealed && (
        <div className="rise-in rounded-2xl border-l-8 border-gold bg-white p-6 shadow-sm" style={{ '--i': 2 } as React.CSSProperties}>
          <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Discuss</p>
          <p className="mt-2 text-2xl font-semibold text-navy">{round.discuss}</p>
          {round.backup && round.backup.length > 0 && (
            <details className="no-print mt-4 text-slate-500">
              <summary className="cursor-pointer text-sm font-semibold">Backup questions</summary>
              <ul className="mt-2 list-disc space-y-1 pl-6 text-lg">
                {round.backup.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

function HostTask({
  task,
  label,
  teams,
  answers,
  revealed,
  event = false,
}: {
  task: Task
  label: string
  teams: TeamRow[]
  answers: AnswerRow[]
  revealed: boolean
  event?: boolean
}) {
  const these = answers.filter((a) => a.task_id === task.id)
  const max = maxPoints(task)
  const full = these.filter((a) => scoreTask(task, a.value) === max).length
  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? '?'

  return (
    <div className={`p-4 ${event ? 'border-l-4 border-l-red-500' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium">
            <span className={`mr-2 font-mono ${event ? 'text-red-500' : 'text-slate-400'}`}>{label}</span>
            {task.prompt}
          </p>
          {task.type === 'numeric' && task.formula && (
            <p className="mt-0.5 text-slate-500">
              <Formula tex={task.formula} /> = ? {task.unit}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-0.5 text-sm font-bold tabular-nums ${
            teams.length > 0 && these.length === teams.length ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {these.length}/{teams.length}
        </span>
      </div>

      {(task.type === 'choice' || task.type === 'discussion' || task.type === 'multivote') && (
        <div className="mt-3">
          <ChoiceChart task={task} answers={answers} teams={teams} revealed={revealed} />
        </div>
      )}

      {revealed && task.type === 'numeric' && (
        <div className="mt-2 text-sm">
          <p>
            Best answer: <b className="text-emerald-700">{withUnit(task.answer, task.unit, task.decimals ?? 2)}</b>
            {task.alternatives?.map((a) => (
              <span key={a.answer} className="ml-2 text-amber-700">
                ({withUnit(a.answer, task.unit)}: {a.points} pts)
              </span>
            ))}
            <span className="ml-2 text-slate-500">
              {full} of {these.length} spot on
            </span>
          </p>
          <p className="mt-1 flex flex-wrap gap-x-4 text-slate-500">
            {these.map((a) => {
              const p = scoreTask(task, a.value)
              return (
                <span key={a.id} className={p === 10 ? 'text-emerald-700' : p > 0 ? 'text-amber-700' : 'text-red-700'}>
                  {teamName(a.team_id)}: {a.value}
                </span>
              )
            })}
          </p>
        </div>
      )}
      {revealed && task.type === 'checklist' && (
        <div className="mt-2 text-sm">
          <ChecklistTable task={task} />
          <p className="mt-1 text-slate-500">
            {full} of {these.length} teams got all {task.items.length} right
          </p>
        </div>
      )}
      {revealed && <p className="mt-2 text-sm text-slate-600">{task.explanation}</p>}
    </div>
  )
}

function FinalScreen({
  game,
  teams,
  answers,
  onBonus,
}: {
  game: GameRow
  teams: TeamRow[]
  answers: AnswerRow[]
  onBonus: (teamId: string, delta: 10 | -10) => void
}) {
  const board = leaderboard(teams, answers, game.revealed_rounds)
  const top = board[0]?.points
  const winners = board.filter((e) => e.points === top)
  return (
    <div className="space-y-8">
      {winners.length > 0 && <WinnerFlyIn names={winners.map((w) => w.team.name)} value={top!} />}
      <div className="after-plane grid gap-8 lg:grid-cols-[3fr_2fr]">
        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <Leaderboard entries={board} onBonus={onBonus} />
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-bold leading-tight text-navy">{centralQuestion}</h1>
          <p className="text-2xl text-slate-700">{finalAnswer}</p>
          <ul className="list-disc space-y-2 pl-6 text-lg text-slate-600">
            {takeaways.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

/** A plane tows the winner's banner onto the projector. Plain silhouette, no airline logo. */
function WinnerFlyIn({ names, value }: { names: string[]; value: number }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-sky-100 to-paper py-10">
      <div className="fly-in flex items-center justify-center">
        <div className="float flex items-center">
          <div className="rounded-2xl border-4 border-navy bg-gold px-8 py-4 text-navy shadow-lg">
            <p className="text-sm font-bold uppercase tracking-[0.3em]">{names.length > 1 ? 'Best paid CFOs' : 'Best paid CFO'}</p>
            <p className="text-5xl font-bold leading-tight">{names.join(' & ')}</p>
            <p className="text-xl font-semibold">{pay(value)} performance bonus</p>
          </div>
          <svg viewBox="0 0 60 10" className="h-4 w-24 shrink-0 text-navy" aria-hidden>
            <path d="M0 5 C20 0 40 10 60 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <svg viewBox="0 0 220 80" className="h-28 w-auto shrink-0" aria-hidden>
            <path d="M18 34 L6 4 L24 4 L56 33 Z" className="fill-navy" />
            <path d="M10 44 C10 37 28 32 58 32 L178 32 C198 32 213 38 216 44 C213 50 198 54 178 54 L40 54 C24 54 10 50 10 44 Z" className="fill-navy" />
            <path d="M196 36 C204 37 210 40 212 43 L198 43 Z" fill="white" opacity="0.85" />
            {Array.from({ length: 11 }, (_, i) => (
              <circle key={i} cx={66 + i * 11} cy={40} r={2.4} fill="white" opacity="0.85" />
            ))}
            <path d="M92 47 L134 47 L104 76 L86 76 Z" className="fill-navy-light" />
            <path d="M20 42 L44 42 L36 50 L22 50 Z" className="fill-navy-light" />
            <path d="M10 47 L216 47" stroke="var(--color-gold)" strokeWidth="2" />
          </svg>
        </div>
      </div>
    </div>
  )
}
