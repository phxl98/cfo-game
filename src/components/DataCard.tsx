import type { Round } from '../content/types'

/** What the event changed: old value (if the row existed) and new value. */
export function eventChanges(round: Round) {
  return (round.event?.data ?? []).map((d) => ({
    key: d.key,
    label: d.label,
    from: round.data.find((r) => r.key === d.key)?.value,
    to: d.value,
  }))
}

/** Round inputs. `bare` drops the card chrome for use inside the boarding pass. */
export function DataCard({ round, eventOn, bare = false }: { round: Round; eventOn: boolean; bare?: boolean }) {
  const eventRows = eventOn && round.event ? round.event.data : []
  const overrides = new Map(eventRows.map((d) => [d.key, d]))
  const added = eventRows.filter((d) => !round.data.some((r) => r.key === d.key))
  const pad = bare ? 'px-0' : 'px-5'

  const content = (
    <>
      {round.intro && <p className={`${pad} pt-3 text-slate-700`}>{round.intro}</p>}
      <table className="w-full text-left">
        <tbody>
          {round.data.map((r) => {
            const o = overrides.get(r.key)
            return (
              <tr key={r.key} className={o ? 'row-flash bg-red-50' : 'odd:bg-slate-50/60'}>
                <td className={`${pad} py-2 pr-3 text-slate-700`}>{(o ?? r).label}</td>
                <td className={`${pad} py-2 text-right font-semibold tabular-nums`}>
                  {o && <span className="mr-2 font-normal text-slate-400 line-through">{r.value}</span>}
                  <span className={o ? 'text-red-700' : ''}>{(o ?? r).value}</span>
                </td>
              </tr>
            )
          })}
          {added.map((r) => (
            <tr key={r.key} className="row-flash bg-red-50">
              <td className={`${pad} py-2 pr-3 text-red-800`}>{r.label}</td>
              <td className={`${pad} py-2 text-right font-semibold text-red-700`}>{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {round.table && (
        <div className="overflow-x-auto border-t border-slate-100">
          <table className="w-full text-left">
            <thead>
              <tr className="text-sm text-slate-500">
                {round.table.columns.map((c) => (
                  <th key={c} className={`${pad} py-2 pr-3 font-medium`}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {round.table.rows.map((row) => (
                <tr key={row[0]} className="odd:bg-slate-50/60">
                  {row.map((cell, i) => (
                    <td key={i} className={`${pad} py-2 pr-3 ${i > 0 ? 'tabular-nums' : ''}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )

  if (bare) return <div className="text-sm">{content}</div>

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <h3 className="border-b border-slate-100 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Data
      </h3>
      {content}
    </section>
  )
}
