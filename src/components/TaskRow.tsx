import { useState } from 'react'
import type { Option, Task, Unit } from '../content/types'
import { eurm, parseNumber, withUnit } from '../lib/format'
import { alternativeHit, decisionValue, isDecision, maxPoints, parseChecklist, parseMulti, scoreTask } from '../lib/scoring'
import { Formula } from './Formula'

/** One question on the boarding pass: the question, the answer field, and later the result. */
export function TaskRow({
  task,
  index,
  event = false,
  order = 0,
  value,
  canSubmit,
  revealed,
  onSubmit,
}: {
  task: Task
  /** Handout number, e.g. "1.3". */
  index: string
  event?: boolean
  /** Position in the list, used to cascade the reveal. */
  order?: number
  value: string | undefined
  canSubmit: boolean
  revealed: boolean
  onSubmit: (value: string) => Promise<void>
}) {
  const [draft, setDraft] = useState('')
  const [picked, setPicked] = useState<string | null>(null)
  const [multi, setMulti] = useState<string[]>([])
  const [checks, setChecks] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submitted = value !== undefined
  const open = !submitted && canSubmit

  async function submit(v: string) {
    setBusy(true)
    setError(null)
    try {
      await onSubmit(v)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="px-6 py-4">
      <p className="text-[1.05rem] font-semibold leading-snug text-navy">
        <span className={`mr-2 font-mono text-sm ${event ? 'text-red-600' : 'text-slate-400'}`}>{index}</span>
        {task.prompt}
      </p>

      <div className="mt-2.5">
        {open && task.type === 'numeric' && (
          <NumericInput formula={task.formula} unit={task.unit} draft={draft} setDraft={setDraft} busy={busy} onSubmit={submit} />
        )}

        {open && isDecision(task) && <p className="mb-1 text-sm text-slate-500">Decision: creates or destroys value, no right or wrong.</p>}

        {open && (task.type === 'choice' || task.type === 'discussion') && (
          <div>
            <OptionList options={task.options} isOn={(id) => picked === id} onToggle={setPicked} round />
            <SubmitButton disabled={busy || picked === null} onClick={() => picked && submit(picked)} />
          </div>
        )}

        {open && task.type === 'multivote' && (
          <div>
            <OptionList
              options={task.options}
              isOn={(id) => multi.includes(id)}
              onToggle={(id) => setMulti(multi.includes(id) ? multi.filter((x) => x !== id) : [...multi, id])}
            />
            <SubmitButton
              label={multi.length === 0 ? 'Submit: none' : 'Submit'}
              disabled={busy}
              onClick={() => submit(JSON.stringify(task.options.map((o) => o.id).filter((id) => multi.includes(id))))}
            />
          </div>
        )}

        {open && task.type === 'checklist' && (
          <div>
            <div className="divide-y divide-slate-100">
              {task.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 py-1.5">
                  <span>{item.label}</span>
                  <div className="flex shrink-0 overflow-hidden rounded-lg border border-slate-300">
                    {[true, false].map((inc) => (
                      <button
                        key={String(inc)}
                        type="button"
                        onClick={() => setChecks({ ...checks, [item.id]: inc })}
                        className={`px-3 py-1 text-sm ${checks[item.id] === inc ? 'bg-navy text-white' : 'bg-white text-slate-600'}`}
                      >
                        {inc ? 'In' : 'Out'}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <SubmitButton
              disabled={busy || task.items.some((i) => checks[i.id] === undefined)}
              onClick={() => submit(JSON.stringify(checks))}
            />
          </div>
        )}

        {submitted && !revealed && <LockedIn task={task} value={value} />}
        {!submitted && !canSubmit && !revealed && <p className="text-sm text-slate-400">Answers are closed.</p>}
        {revealed && <Result task={task} value={value} order={order} />}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  )
}

function OptionList({
  options,
  isOn,
  onToggle,
  round = false,
}: {
  options: Option[]
  isOn: (id: string) => boolean
  onToggle: (id: string) => void
  /** Radio dots for single choice, square boxes for tick-all-that-apply. */
  round?: boolean
}) {
  return (
    <div className="-mx-2">
      {options.map((o) => {
        const on = isOn(o.id)
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onToggle(o.id)}
            aria-pressed={on}
            className="press-wide flex w-full items-start gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-slate-50"
          >
            <span
              className={`mt-[0.2em] h-4 w-4 shrink-0 border-2 ${round ? 'rounded-full' : 'rounded'} ${
                on ? 'border-navy bg-navy shadow-[inset_0_0_0_2px_white]' : 'border-slate-300'
              }`}
            />
            <span className={on ? 'text-navy' : ''}>
              {o.id.length === 1 && <b className="mr-1.5">{o.id}</b>}
              {o.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function SubmitButton({ disabled, onClick, label = 'Submit' }: { disabled: boolean; onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="mt-2 rounded-xl bg-navy px-5 py-2 font-semibold text-white disabled:opacity-30"
    >
      {label}
    </button>
  )
}

function NumericInput({
  formula,
  unit,
  draft,
  setDraft,
  busy,
  onSubmit,
}: {
  formula?: string
  unit: Unit
  draft: string
  setDraft: (v: string) => void
  busy: boolean
  onSubmit: (v: string) => void
}) {
  const parsed = parseNumber(draft)
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (parsed !== null && !busy) onSubmit(draft.trim())
      }}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {formula && (
          <span className="text-slate-700">
            <Formula tex={formula} /> =
          </span>
        )}
        <span className="flex items-center gap-2">
          <input
            inputMode="decimal"
            autoComplete="off"
            aria-label={formula ?? 'Answer'}
            placeholder={placeholder[unit]}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-32 rounded-lg border-2 border-slate-200 px-3 py-1.5 text-lg font-semibold text-navy tabular-nums outline-none placeholder:font-normal placeholder:text-slate-300 focus:border-gold"
          />
          {unit && <span className="font-semibold text-slate-500">{unit}</span>}
        </span>
        <button type="submit" disabled={busy || parsed === null} className="rounded-xl bg-navy px-5 py-2 font-semibold text-white disabled:opacity-30">
          Submit
        </button>
      </div>
      <p className={`mt-1 text-xs ${draft && parsed === null ? 'text-red-600' : 'text-slate-400'}`}>
        {draft && parsed === null ? 'Not a number' : 'Round to 2 decimals · comma or point both work'}
      </p>
    </form>
  )
}

const placeholder: Record<Unit, string> = { '%': 'e.g. 7.25', '€ m': 'e.g. −12.50', '': 'e.g. 1.25' }

function answerText(task: Task, value: string): string {
  if (task.type === 'numeric') return /[%m]$/.test(value.trim()) || !task.unit ? value : `${value} ${task.unit}`
  if (task.type === 'checklist') {
    const v = parseChecklist(value)
    return task.items.map((i) => `${i.label} ${v[i.id] ? 'in' : 'out'}`).join(' · ')
  }
  if (task.type === 'multivote') {
    const ids = parseMulti(value)
    return ids.length ? task.options.filter((o) => ids.includes(o.id)).map((o) => o.label).join(', ') : 'None'
  }
  const o = task.options.find((x) => x.id === value)
  return o ? `${o.id.length === 1 ? `${o.id}: ` : ''}${o.label}` : value
}

function LockedIn({ task, value }: { task: Task; value: string }) {
  return (
    <p className="rise-in flex items-start gap-2">
      <svg viewBox="0 0 16 16" className="mt-[0.3em] h-4 w-4 shrink-0 text-gold" aria-hidden>
        <path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>
        <span className="font-semibold text-navy">{answerText(task, value)}</span>
        <span className="ml-2 text-sm text-slate-400">Locked in</span>
      </span>
    </p>
  )
}

function Result({ task, value, order }: { task: Task; value: string | undefined; order: number }) {
  if (isDecision(task)) return <DecisionResult task={task} value={value} order={order} />
  if (task.type === 'checklist') return <ChecklistResult task={task} value={value} order={order} />

  const max = maxPoints(task)
  const points = scoreTask(task, value)
  const color = max === 0 ? 'text-slate-500' : points === max ? 'text-emerald-600' : points > 0 ? 'text-amber-600' : 'text-red-600'
  const mark = max === 0 ? '•' : points === max ? '✓' : points > 0 ? '≈' : '✗'
  const alt = alternativeHit(task, value)

  let correct: string | null = null
  if (task.type === 'numeric') correct = withUnit(task.answer, task.unit, task.decimals ?? 2)
  if (task.type === 'choice') {
    const best = Math.max(...task.options.map((o) => o.points))
    correct = answerText(task, task.options.find((o) => o.points === best)!.id)
  }

  return (
    <div className="rise-in flex gap-2.5 text-sm" style={{ '--i': order } as React.CSSProperties}>
      <span className={`w-4 shrink-0 text-center text-base font-bold leading-snug ${color}`}>{mark}</span>
      <div>
        <p className="font-semibold text-navy">
          {value === undefined ? 'No answer' : answerText(task, value)}
          {max > 0 && <span className={`ml-2 font-semibold ${color}`}>{points} / {max} pts</span>}
        </p>
        {alt && <p className="mt-0.5 text-amber-700">{alt.note}</p>}
        {correct && points < max && <p className="mt-0.5 text-slate-700">Best answer: <b>{correct}</b></p>}
        <p className="mt-0.5 text-slate-500">{task.explanation}</p>
      </div>
    </div>
  )
}

function DecisionResult({ task, value, order }: { task: Task; value: string | undefined; order: number }) {
  const created = decisionValue(task, value)
  const color = created > 0 ? 'text-emerald-600' : created < 0 ? 'text-red-600' : 'text-slate-500'
  return (
    <div className="rise-in text-sm" style={{ '--i': order } as React.CSSProperties}>
      <p className="font-semibold text-navy">
        {value === undefined ? 'No decision' : answerText(task, value)}
        <span className={`ml-2 ${color}`}>
          Value created: {created > 0 ? '+' : ''}
          {eurm(created)}
        </span>
      </p>
      <p className="mt-0.5 text-slate-500">{task.explanation}</p>
    </div>
  )
}

function ChecklistResult({ task, value, order }: { task: Extract<Task, { type: 'checklist' }>; value: string | undefined; order: number }) {
  const picked = value === undefined ? {} : parseChecklist(value)
  const points = scoreTask(task, value)
  return (
    <div className="rise-in text-sm" style={{ '--i': order } as React.CSSProperties}>
      <ChecklistTable task={task} picked={value === undefined ? undefined : picked} />
      <p className="mt-1.5">
        <span className={`font-semibold ${points === maxPoints(task) ? 'text-emerald-600' : 'text-amber-600'}`}>
          {points} / {maxPoints(task)} pts
        </span>
        <span className="ml-2 text-slate-500">{task.explanation}</span>
      </p>
    </div>
  )
}

/** Correct in/out per item; with `picked`, each row turns green or red for the team's own choice. */
export function ChecklistTable({
  task,
  picked,
}: {
  task: Extract<Task, { type: 'checklist' }>
  picked?: Record<string, boolean>
}) {
  return (
    <table className="w-full text-left">
      <thead>
        <tr className="text-xs uppercase tracking-wide text-slate-400">
          <th className="py-1 pr-2 font-medium">Item</th>
          <th className="py-1 pr-2 font-medium">Correct</th>
          {picked && <th className="py-1 pr-2 font-medium">You</th>}
          <th className="py-1 font-medium">Why</th>
        </tr>
      </thead>
      <tbody>
        {task.items.map((i) => {
          const mine = picked?.[i.id]
          const right = mine === i.include
          return (
            <tr
              key={i.id}
              className={`border-t border-slate-100 ${picked ? (right ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-900') : ''}`}
            >
              <td className="py-1 pr-2 pl-1 font-medium">{i.label}</td>
              <td className="py-1 pr-2 font-semibold">{i.include ? 'In' : 'Out'}</td>
              {picked && <td className="py-1 pr-2">{mine === undefined ? '–' : mine ? 'In' : 'Out'}</td>}
              <td className="py-1 pr-1 opacity-80">{i.reason}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
