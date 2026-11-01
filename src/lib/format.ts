import type { Unit } from '../content/types'

const MINUS = '−'

export function num(x: number, decimals = 2): string {
  const s = Math.abs(x).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return x < 0 && Number(s.replace(/,/g, '')) !== 0 ? MINUS + s : s
}

export const pct = (x: number, decimals = 2) => `${num(x, decimals)}%`

export const eur = (x: number, decimals = 2) =>
  x < 0 ? `${MINUS}€${num(-x, decimals)}` : `€${num(x, decimals)}`

export const eurm = (x: number, decimals = 2) => `${eur(x, decimals)} m`

/** CFO pay: every point is worth €1,000. */
export const pay = (points: number) => `${points < 0 ? MINUS : ''}€${num(Math.abs(points), 0)}k`

export function withUnit(x: number, unit: Unit, decimals = 2): string {
  if (unit === '%') return pct(x, decimals)
  if (unit === '€ m') return eurm(x, decimals)
  return num(x, decimals)
}

/**
 * Reads what students type: "7.14", "7,14", "7.14%", "−6.77", "€11.7 m", "1,234.5".
 * Returns null when no number can be read.
 */
export function parseNumber(raw: string): number | null {
  let s = raw.trim().replace(/[−–—]/g, '-')
  s = s.replace(/[^0-9.,-]/g, '')
  if (s.includes(',') && s.includes('.')) s = s.replace(/,/g, '')
  else s = s.replace(',', '.')
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}
