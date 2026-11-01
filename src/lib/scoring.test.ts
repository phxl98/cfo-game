import { describe, expect, it } from 'vitest'
import { parseNumber } from './format'
import { alternativeHit, leaderboard, scoreTask, taskById } from './scoring'

describe('parseNumber', () => {
  it.each([
    ['7.14', 7.14], ['7,14', 7.14], ['7.14%', 7.14], [' 7.14 % ', 7.14], ['−6.77', -6.77], ['-6.77', -6.77],
    ['€11.7 m', 11.7], ['1,234.5', 1234.5], ['.5', 0.5], ['625', 625],
    ['10,2', 10.2], ['7,14 %', 7.14], ['−6,77', -6.77], ['11,74', 11.74],
  ])('%s -> %d', (raw, n) => expect(parseNumber(raw)).toBeCloseTo(n, 6))

  it.each(['', 'abc', '7.1.4', '--3'])('%s -> null', (raw) => expect(parseNumber(raw)).toBeNull())
})

describe('scoreTask', () => {
  const wacc = taskById('r1.wacc')!
  const npv = taskById('r3.npv')!

  it('numeric rates', () => {
    expect(scoreTask(wacc, '7.14')).toBe(10)
    expect(scoreTask(wacc, '7,1')).toBe(10)
    expect(scoreTask(wacc, '0.0714')).toBe(10)
    expect(scoreTask(wacc, '7.25')).toBe(5)
    expect(scoreTask(wacc, '5.99')).toBe(0)
  })

  it('comma and point score the same', () => {
    expect(scoreTask(npv, '11,74')).toBe(scoreTask(npv, '11.74'))
  })

  it('a WACC with CAPM only earns partial points', () => {
    expect(scoreTask(wacc, '6.94')).toBe(7)
    expect(scoreTask(wacc, '6,94 %')).toBe(7)
    expect(alternativeHit(wacc, '6.94')?.points).toBe(7)
    expect(alternativeHit(wacc, '7.14')).toBeUndefined()
  })

  it('numeric € m', () => {
    expect(scoreTask(npv, '11.74')).toBe(10)
    expect(scoreTask(npv, '12.5')).toBe(5)
    expect(scoreTask(npv, '14.9')).toBe(0)
  })

  it('choice and checklist', () => {
    expect(scoreTask(taskById('r1.weights')!, 'C')).toBe(10)
    expect(scoreTask(taskById('r1.weights')!, 'B')).toBe(7)
    const all = JSON.stringify({ study: false, hangar: true, cannib: true, interest: false, nwc: true })
    expect(scoreTask(taskById('r3.check')!, all)).toBe(10)
    expect(scoreTask(taskById('r3.check')!, JSON.stringify({ study: true, hangar: true }))).toBe(2)
  })

  it('decisions never score points', () => {
    expect(scoreTask(taskById('r2.decide')!, JSON.stringify(['freight', 'hangar']))).toBe(0)
  })
})

describe('leaderboard', () => {
  const team = (id: string, bonus?: number) => ({ id, game_id: 'g', name: id, bonus, created_at: '' })
  const answer = { id: 'a', game_id: 'g', team_id: 'A', round: 1, task_id: 'r1.wacc', value: '7.14', created_at: '' }

  it('counts revealed rounds plus the captain’s bonus', () => {
    const board = leaderboard([team('A'), team('B', 20)], [answer], [1])
    expect(board.map((e) => [e.team.id, e.points])).toEqual([['B', 20], ['A', 10]])
  })

  it('decision values count once revealed', () => {
    const decide = { ...answer, id: 'b', round: 2, task_id: 'r2.decide', value: JSON.stringify(['hangar']) }
    const [a] = leaderboard([team('A')], [answer, decide], [1, 2])
    expect(a.points).toBeCloseTo(15.15, 2)
  })

  it('bonus counts before any reveal, a missing bonus column counts as 0', () => {
    expect(leaderboard([team('A'), team('B', 10)], [answer], []).map((e) => e.points)).toEqual([10, 0])
  })
})
