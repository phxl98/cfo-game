import type { ReactNode } from 'react'

/**
 * Typesets the mini formula syntax used in rounds.ts:
 * `r_f` and `β_{down}` become subscripts, `{a}/{b}` a stacked fraction, other braces just group.
 */
export function Formula({ tex, className = '' }: { tex: string; className?: string }) {
  return <span className={`formula ${className}`}>{parse(tex)}</span>
}

function parse(s: string): ReactNode[] {
  const out: ReactNode[] = []
  let text = ''
  const flush = () => {
    if (text) out.push(text)
    text = ''
  }
  let i = 0
  while (i < s.length) {
    if (s[i] === '{') {
      const top = group(s, i)
      if (s[top.end] === '/' && s[top.end + 1] === '{') {
        const bottom = group(s, top.end + 1)
        flush()
        out.push(
          <span key={out.length} className="frac">
            <span>{parse(top.body)}</span>
            <span>{parse(bottom.body)}</span>
          </span>,
        )
        i = bottom.end
      } else {
        text += top.body
        i = top.end
      }
    } else if (s[i] === '_') {
      const sub = s[i + 1] === '{' ? group(s, i + 1) : { body: s[i + 1] ?? '', end: i + 2 }
      flush()
      out.push(<sub key={out.length}>{parse(sub.body)}</sub>)
      i = sub.end
    } else {
      text += s[i]
      i++
    }
  }
  flush()
  return out
}

/** The text inside the braces that open at `open`, and the index after the closing brace. */
function group(s: string, open: number) {
  let depth = 0
  for (let j = open; j < s.length; j++) {
    if (s[j] === '{') depth++
    else if (s[j] === '}' && --depth === 0) return { body: s.slice(open + 1, j), end: j + 1 }
  }
  return { body: s.slice(open + 1), end: s.length }
}
