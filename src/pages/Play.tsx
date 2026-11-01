import { Fragment, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { BoardingPass, Field, PassHeader, Perforation } from '../components/BoardingPass'
import { DataCard, eventChanges } from '../components/DataCard'
import { BreakingNewsFlash } from '../components/BreakingNewsFlash'
import { RouteBar } from '../components/RouteBar'
import { TaskRow } from '../components/TaskRow'
import { centralQuestion, finalAnswer, roundByNumber, rounds, routeStatus, taskNumbers } from '../content/rounds'
import type { Round, Task } from '../content/types'
import { useGame } from '../hooks/useGame'
import { TEAM_FONT_SIZE, useRootFontSize } from '../hooks/useRootFontSize'
import { backend } from '../lib/backend'
import { pay } from '../lib/format'
import { leaderboard, pendingEventRound, teamScore } from '../lib/scoring'
import { teamSession } from '../lib/storage'

export function Play() {
  const session = teamSession.get()
  const { snap, error, refresh } = useGame(session?.gameId ?? null)
  useRootFontSize(TEAM_FONT_SIZE)

  if (!session) return <Navigate to="/" replace />
  if (snap && !snap.game) {
    teamSession.set(null)
    return <Navigate to="/" replace />
  }

  const game = snap?.game
  const answers = snap?.answers ?? []
  const mine = answers.filter((a) => a.team_id === session.teamId)
  const me = snap?.teams.find((t) => t.id === session.teamId)
  const points = game && me ? teamScore(me, answers, game.revealed_rounds, pendingEventRound(game)) : 0
  const round = game ? roundByNumber(game.current_round) : undefined
  const state = game?.round_state
  const eventOn = !!game && !!round && game.event_rounds.includes(round.n)
  const revealed = state === 'revealed'
  const canSubmit = state === 'open' || state === 'event'
  // During breaking news the round's own tasks stay revealed; only the news tasks are open.
  const mainRevealed = revealed || (!!game && !!round && game.revealed_rounds.includes(round.n))
  const finished = state === 'finished'
  const playing = !!round && !!state && state !== 'locked' && !finished
  const valueOf = (taskId: string) => mine.find((a) => a.task_id === taskId)?.value

  async function submit(roundN: number, taskId: string, value: string) {
    await backend.submitAnswer({ game_id: session!.gameId, team_id: session!.teamId, round: roundN, task_id: taskId, value })
    refresh()
  }

  const numbers = round ? taskNumbers(round) : new Map<string, string>()
  const rows = (tasks: Task[], event: boolean, offset: number, shown = revealed) =>
    tasks.map((t, i) => (
      <Fragment key={t.id}>
        <Perforation />
        <TaskRow
          task={t}
          index={numbers.get(t.id) ?? ''}
          event={event}
          order={offset + i}
          value={valueOf(t.id)}
          canSubmit={canSubmit && !shown}
          revealed={shown}
          onSubmit={(v) => submit(round!.n, t.id, v)}
        />
      </Fragment>
    ))

  return (
    <BoardingPass>
      <PassHeader round={round && !finished ? round.n : undefined} total={rounds.length} timerEnd={game?.timer_end ?? null} />

      {game && (game.current_round >= 2 || finished) && (
        <RouteBar
          route={routeStatus(game.revealed_rounds, game.event_rounds.filter((n) => n !== pendingEventRound(game)), valueOf)}
          className="border-b border-slate-100 bg-slate-50 px-6 py-2 text-sm"
        />
      )}

      {error && <p className="bg-amber-100 px-6 py-2 text-sm text-amber-900">Connection problem, retrying…</p>}

      <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-4 px-6 pt-5">
        <Field label="Passenger" value={session.name} />
        <Field label="Flight" value={<span className="font-mono tracking-wider">{session.code}</span>} />
        <Field label="Your pay" value={<span className="tabular-nums">{pay(points)}</span>} className="text-right" />
      </div>

      {!snap && <p className="px-6 py-10 text-center text-slate-400">Loading…</p>}

      {game && !playing && !finished && (
        <>
          <div className="px-6 pt-5 pb-3">
            <Field label="Status" value="Boarding soon" />
            <p className="mt-1 text-slate-500">Waiting for the CFO briefing{round ? `: Round ${round.n}, ${round.title}` : ''}.</p>
          </div>
          <Perforation />
          <p className="px-6 pt-3 pb-8 text-center text-xl font-bold text-balance text-navy">{centralQuestion}</p>
        </>
      )}

      {playing && round && (
        <>
          <div className="px-6 pt-4 pb-3">
            <Field label={`Destination · ${round.chapter}`} value={round.title} className="[&>p:last-child]:whitespace-normal [&>p:last-child]:text-xl" />
            <p className="mt-0.5 text-slate-500">{round.question}</p>
            <FlightData key={round.n} round={round} eventOn={eventOn} />
          </div>

          {state === 'event' && round.event && <BreakingNewsFlash title={round.event.title} />}
          {rows(round.tasks, false, 0, mainRevealed)}

          {eventOn && round.event && (
            <>
              <Perforation />
              <EventNotice round={round} />
              {rows(round.event.tasks, true, round.tasks.length)}
            </>
          )}

          {revealed ? (
            <div className="rise-in mt-2 rounded-b-3xl bg-navy px-6 py-5 text-white">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-gold">Takeaway</p>
              <p className="mt-1">{round.reveal}</p>
              {eventOn && round.event && <p className="mt-2 text-white/70">{round.event.explanation}</p>}
            </div>
          ) : (
            <div className="h-3" />
          )}
        </>
      )}

      {finished && game && (
        <>
          <div className="px-6 pt-5 pb-3">
            <Field
              label="Final rank"
              value={`#${leaderboard(snap!.teams, answers, game.revealed_rounds).findIndex((e) => e.team.id === session.teamId) + 1} of ${snap!.teams.length}`}
            />
          </div>
          <Perforation />
          <div className="px-6 pt-3 pb-8">
            <p className="text-xl font-bold text-balance text-navy">{centralQuestion}</p>
            <p className="mt-2 text-slate-700">{finalAnswer}</p>
          </div>
        </>
      )}
    </BoardingPass>
  )
}

function FlightData({ round, eventOn }: { round: Round; eventOn: boolean }) {
  const [open, setOpen] = useState(false)
  const count = round.data.length + (round.table?.rows.length ?? 0)
  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex items-center gap-1.5 text-sm font-semibold text-navy-light"
      >
        <svg
          viewBox="0 0 16 16"
          aria-hidden
          className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
        >
          <path d="M6 3.5l4.5 4.5L6 12.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {open ? 'Hide flight data' : `Flight data (${count})`}
      </button>
      <div className="drawer" data-open={open}>
        <div>
          <div className="pt-2">
            <DataCard round={round} eventOn={eventOn} bare />
          </div>
        </div>
      </div>
    </div>
  )
}

function EventNotice({ round }: { round: Round }) {
  const event = round.event!
  return (
    <div className="banner-in mx-6 mt-4 border-l-4 border-red-600 pl-4">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-red-600">Breaking news</p>
      <p className="mt-0.5 text-lg font-bold text-navy">{event.title}</p>
      <p className="mt-0.5 text-slate-600">{event.text}</p>
      <ul className="mt-1.5 space-y-0.5 text-sm">
        {eventChanges(round).map((c) => (
          <li key={c.key}>
            <span className="text-slate-500">{c.label}:</span>{' '}
            {c.from && <span className="text-slate-400 line-through">{c.from}</span>}
            {c.from && ' → '}
            <b className="text-red-700">{c.to}</b>
          </li>
        ))}
      </ul>
    </div>
  )
}
