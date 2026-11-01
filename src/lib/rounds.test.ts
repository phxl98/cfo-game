import { describe, expect, it } from 'vitest'
import { rounds, routeStatus, taskNumbers } from '../content/rounds'
import type { Task } from '../content/types'
import { decisionValue, maxPoints, scoreTask, taskById } from './scoring'

// The answer key from the build spec, rounded as published.
const expected: Record<string, number> = {
  'r1.kd': 3.08, 'r1.capm': 10.2, 'r1.wacc': 7.14,
  'r2.route': 6.94, 'r2.freight': 8.59, 'r2.hangar': 5.29,
  'r3.cf': 38, 'r3.pv': 97.93, 'r3.end': 23.81, 'r3.npv': 11.74,
  'r4.enpv': 8.35, 'r4.cv': 3.83, 'r4.down': 12.95, 'r4.e.enpv': -1.32,
  'r5.green': 625, 'r5.conv': 562.5, 'r5.crisis': 529.41,
}

const oneDecimal = new Set<string>()

describe('answer key', () => {
  for (const [id, value] of Object.entries(expected)) {
    it(id, () => {
      const t = taskById(id) as Extract<Task, { type: 'numeric' }>
      expect(t?.type).toBe('numeric')
      expect(Math.abs(t.answer - value)).toBeLessThanOrEqual(oneDecimal.has(id) ? 0.051 : 0.0051)
    })
  }

  it('every numeric task is checked', () => {
    const numeric = rounds.flatMap((r) => [...r.tasks, ...(r.event?.tasks ?? [])]).filter((t) => t.type === 'numeric')
    expect(numeric.map((t) => t.id).sort()).toEqual(Object.keys(expected).sort())
  })

  it('at most 5 rounds, at most 4 calculations each', () => {
    expect(rounds.length).toBeLessThanOrEqual(5)
    for (const r of rounds) expect(r.tasks.filter((t) => t.type === 'numeric').length).toBeLessThanOrEqual(4)
  })

  it('task ids are unique', () => {
    const ids = rounds.flatMap((r) => [...r.tasks, ...(r.event?.tasks ?? [])]).map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('structure', () => {
  const all = rounds.flatMap((r) => [...r.tasks, ...(r.event?.tasks ?? [])])

  it('a perfect CFO earns €245k', () => {
    expect(all.reduce((sum, t) => sum + maxPoints(t), 0)).toBe(245)
  })

  it('every numeric task shows its formula', () => {
    for (const t of all) if (t.type === 'numeric') expect(t.formula, t.id).toBeTruthy()
  })

  it('every round has a chapter and exactly one main discussion question', () => {
    for (const r of rounds) {
      expect(r.chapter).toBeTruthy()
      expect(typeof r.discuss).toBe('string')
    }
  })

  it('numbers follow the handout: 4.1, 4.2 … breaking news tasks continue', () => {
    const r4 = rounds[3]
    const n = taskNumbers(r4)
    expect(n.get(r4.tasks[0].id)).toBe('4.1')
    expect(n.get(r4.event!.tasks[0].id)).toBe(`4.${r4.tasks.length + 1}`)
  })

  it('breaking news only in round 4', () => {
    expect(rounds.filter((r) => r.event).map((r) => r.n)).toEqual([4])
  })

  it('at most one decision per round', () => {
    for (const r of rounds) {
      const tasks = [...r.tasks, ...(r.event?.tasks ?? [])]
      expect(tasks.filter((t) => (t.type === 'choice' || t.type === 'multivote') && t.decision).length).toBeLessThanOrEqual(1)
    }
  })
})

describe('decisions', () => {
  it('pay 5 per project called right', () => {
    const t = taskById('r2.decide')!
    expect(scoreTask(t, JSON.stringify(['route', 'hangar']))).toBe(15)
    expect(scoreTask(t, JSON.stringify(['hangar']))).toBe(10)
    expect(scoreTask(t, JSON.stringify([]))).toBe(5)
    expect(scoreTask(t, JSON.stringify(['freight']))).toBe(0)
  })

  it('freighters destroy, the hangar creates value (shown, not scored)', () => {
    const t = taskById('r2.decide')!
    expect(decisionValue(t, JSON.stringify(['freight']))).toBeCloseTo(-7.88, 2)
    expect(decisionValue(t, JSON.stringify(['hangar']))).toBeCloseTo(5.15, 2)
    expect(decisionValue(t, JSON.stringify([]))).toBe(0)
  })

  it('the fuel hedge beats going ahead or cancelling', () => {
    const t = taskById('r4.e.react')!
    expect(decisionValue(t, 'A')).toBeCloseTo(-1.32, 2)
    expect(decisionValue(t, 'B')).toBe(0)
    expect(decisionValue(t, 'C')).toBeCloseTo(2.68, 2)
    expect([scoreTask(t, 'C'), scoreTask(t, 'B'), scoreTask(t, 'A')]).toEqual([10, 5, 0])
  })
})

describe('routeStatus', () => {
  it('starts under review', () => expect(routeStatus([], []).status).toBe('under review'))
  it('preliminary after round 2', () => expect(routeStatus([1, 2], []).status).toBe('preliminary'))
  it('NPV after round 3', () => {
    const s = routeStatus([1, 2, 3], [])
    expect(s.npv).toBe('€11.74 m')
    expect(s.status).toBe('approved')
  })
  it('fuel shock: under review on the projector, the team’s own call on its pass', () => {
    expect(routeStatus([1, 2, 3, 4], [4]).status).toBe('under review')
    expect(routeStatus([1, 2, 3, 4], [4], () => 'B').status).toBe('rejected')
    expect(routeStatus([1, 2, 3, 4, 5], [4], () => 'C').status).toBe('hedged')
  })
})
