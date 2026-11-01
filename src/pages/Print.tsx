import { centralQuestion, rounds, taskNumbers } from '../content/rounds'
import { Formula } from '../components/Formula'
import type { Round, Task } from '../content/types'

/** Handout: data and empty answer boxes for every round; a round never splits across pages. */
export function Print() {
  return (
    <div className="mx-auto max-w-[190mm] bg-white px-4 py-6 text-[9.5pt] leading-snug text-black print:p-0">
      <div className="no-print mb-6 flex items-center justify-between rounded-xl bg-slate-100 p-4">
        <p>Handout for all {rounds.length} rounds. The breaking news data stays secret; its answer boxes are included.</p>
        <button onClick={() => window.print()} className="rounded-lg bg-navy px-4 py-2 font-semibold text-white">
          Print
        </button>
      </div>
      <header className="mb-3 flex items-baseline justify-between border-b-2 border-black pb-1">
        <h1 className="text-[13pt] font-bold">CFO Game · Lufthansa · Calculation sheet</h1>
        <span>Team: ______________________</span>
      </header>
      <p className="mb-3 italic">{centralQuestion}</p>
      {rounds.map((r) => (
        <RoundSheet key={r.n} round={r} />
      ))}
    </div>
  )
}

function RoundSheet({ round }: { round: Round }) {
  const numbers = taskNumbers(round)
  const numbered = round.tasks.map((t) => ({ t, label: numbers.get(t.id)! }))
  const eventTasks = round.event?.tasks.map((t) => ({ t, label: numbers.get(t.id)! })) ?? []
  return (
    <section className="mb-4 break-inside-avoid border-b border-dashed border-slate-400 pb-3">
      <h2 className="text-[11pt] font-bold">
        Round {round.n}: {round.title} <span className="font-normal">({round.chapter})</span>
      </h2>
      <p className="mb-2">{round.question}</p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          {round.intro && <p className="mb-1">{round.intro}</p>}
          <table className="w-full">
            <tbody>
              {round.data.map((d) => (
                <tr key={d.key} className="border-b border-slate-200">
                  <td className="py-0.5 pr-2">{d.label}</td>
                  <td className="py-0.5 text-right font-semibold whitespace-nowrap">{d.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {round.table && (
            <table className="mt-2 w-full">
              <thead>
                <tr className="border-b border-black text-left">
                  {round.table.columns.map((c) => (
                    <th key={c} className="pr-2 font-semibold">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {round.table.rows.map((row) => (
                  <tr key={row[0]} className="border-b border-slate-200">
                    {row.map((cell, i) => (
                      <td key={i} className="pr-2">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="space-y-1.5">
          {numbered.map(({ t, label }) => (
            <AnswerBox key={t.id} task={t} label={label} />
          ))}
          {eventTasks.length > 0 && (
            <>
              <p className="pt-1 font-bold">Breaking news (when announced): ______________________</p>
              {eventTasks.map(({ t, label }) => (
                <AnswerBox key={t.id} task={t} label={label} />
              ))}
            </>
          )}
        </div>
      </div>
    </section>
  )
}

function AnswerBox({ task, label }: { task: Task; label: string }) {
  if (task.type === 'numeric') {
    return (
      <div className="flex items-center justify-between gap-2">
        <span>
          <b>{label}</b> {task.prompt}
          {task.formula && (
            <span className="block pl-6">
              <Formula tex={task.formula} /> =
            </span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <span className="inline-block h-[7mm] w-[24mm] border border-black" />
          <span className="w-6">{task.unit}</span>
        </span>
      </div>
    )
  }
  if (task.type === 'checklist') {
    return (
      <div>
        <b>{label}</b> {task.prompt}
        {task.items.map((i) => (
          <div key={i.id} className="flex justify-between pl-4">
            <span>{i.label}</span>
            <span>☐ in &nbsp; ☐ out</span>
          </div>
        ))}
      </div>
    )
  }
  return (
    <div>
      <b>{label}</b> {task.prompt}
      <div className="pl-4">
        {task.options.map((o) => (
          <span key={o.id} className="mr-3 inline-block">
            ☐ {o.id.length === 1 ? `${o.id}: ` : ''}
            {o.label}
          </span>
        ))}
      </div>
    </div>
  )
}
