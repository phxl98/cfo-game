// All game content lives here. Change an input and every answer derived from it follows.
// Numbers are simplified for teaching and consistent across rounds.
// Each round fits about 11 minutes: a few short calculations, at most one project decision, one discussion question.
// Only round 4 has breaking news.

import { eur, eurm, num, pct } from '../lib/format'
import type { Round, RouteState, Task } from './types'

export const centralQuestion = 'Does a project that beats the WACC really create value?'

export const finalAnswer =
  "Only if the hurdle rate fits the project's risk, the cash flows are the right ones, and the project survives realistic shocks."

export const takeaways = [
  'Cost of capital comes from today’s market data: YTM on new debt, not the old coupon; target weights, not book values.',
  'One group WACC for every division accepts too many risky projects and rejects too many safe ones.',
  'Count incremental cash flows only: opportunity costs and cannibalization in, sunk costs and interest out.',
  'Test the NPV: scenarios, risk-adjusted hurdle rates and downside risk show how fragile the case is.',
  'Expected losses belong in the cash flows; only systematic risk belongs in the discount rate.',
]

const r4 = (x: number) => Math.round(x * 10000) / 10000
const annuityFactor = (ratePct: number, years: number) =>
  (1 - (1 + ratePct / 100) ** -years) / (ratePct / 100)
const discountFactor = (ratePct: number, years: number) => (1 + ratePct / 100) ** -years
const expected = (s: { p: number; v: number }[]) => s.reduce((a, x) => a + x.p * x.v, 0)

// ---------- Round 1: cost of capital ----------
const rf = 2.5
const mrp = 5.5
const beta = 1.4
const p0 = 6.4
const sharesBn = 1.25
const d1 = 0.256
const payout = 0.3
const roe = 10
const coupon = 2.0
const ytm = 4.4
const hybridDividend = 6
const hybridIssueCost = 0.02
const tax = 0.3
const mvDebt = 8
const mvHybrid = 2
const bvEquity = 5
const payables = 3
const wD = 0.4
const wP = 0.1
const wE = 0.5

const kd = ytm * (1 - tax)
const kp = (hybridDividend / (100 * (1 - hybridIssueCost))) * 100
const capm = rf + beta * mrp
const g = (1 - payout) * roe
const dcf = (d1 / p0) * 100 + g
const ke = (capm + dcf) / 2
const wacc = wD * kd + wP * kp + wE * ke
const waccBook = (mvDebt * kd + mvHybrid * kp + bvEquity * ke) / (mvDebt + mvHybrid + bvEquity)
const mvEquity = sharesBn * p0
const mvTotal = mvDebt + mvHybrid + mvEquity
const waccMarket = (mvDebt * kd + mvHybrid * kp + mvEquity * ke) / mvTotal

// ---------- Round 2: one hurdle rate per project ----------
const divisionWacc = (b: number) => wD * kd + wP * kp + wE * (rf + b * mrp)
const groupWaccCapm = divisionWacc(beta)
const projectYears = 10
const projects = {
  route: { name: 'New long haul route', short: 'route', beta: 1.4, investment: 110, irr: 9 },
  freight: { name: 'Two new freighters', short: 'freighters', beta: 2.0, investment: 300, irr: 8 },
  hangar: { name: 'New engine hangar', short: 'engine hangar', beta: 0.8, investment: 150, irr: 6 },
}
/** NPV at the right hurdle rate of a project that earns its IRR as a 10-year annuity. */
const projectNpv = (p: { beta: number; investment: number; irr: number }) =>
  p.investment * (annuityFactor(divisionWacc(p.beta), projectYears) / annuityFactor(p.irr, projectYears) - 1)
const freightNpv = projectNpv(projects.freight)
const hangarNpv = projectNpv(projects.hangar)
const routeNpv = projectNpv(projects.route)

const hurdleTask = (id: keyof typeof projects): Task => {
  const p = projects[id]
  return {
    id: `r2.${id}`,
    type: 'numeric',
    unit: '%',
    formula: 'w_d r_d(1 − T) + w_p r_p + w_e (r_f + β × market risk premium)',
    prompt: `Hurdle rate for the ${p.short} (β ${num(p.beta, 1)})`,
    answer: divisionWacc(p.beta),
    explanation: `Cost of equity ${num(rf, 1)} + ${num(p.beta, 1)} × ${num(mrp, 1)} = ${pct(rf + p.beta * mrp)}, hurdle rate = ${pct(divisionWacc(p.beta))}.`,
  }
}

// ---------- Round 3: incremental cash flows ----------
const rate3 = 8
const af8 = r4(annuityFactor(rate3, 3))
const df8 = r4(discountFactor(rate3, 3))
const capex = 100
const nwc = 10
const ocf = 45
const study = 2
const hangarRent = 3
const cannibalization = 4
const interest = 5
const salvage = 20
const cf = ocf - hangarRent - cannibalization
const terminal = salvage + nwc
const pvCf = cf * af8
const pvEnd = terminal * df8
const npv = -(capex + nwc) + pvCf + pvEnd
const npvWrong = -(capex + nwc + study) + (ocf - interest) * af8 + terminal * df8
const breakEven = npv / af8

// ---------- Round 4: risk ----------
const baseNpv = Math.round(npv * 10) / 10
const scenarios = [
  { name: 'Worst', p: 0.25, v: -40 },
  { name: 'Base', p: 0.5, v: baseNpv },
  { name: 'Best', p: 0.25, v: 50 },
]
const eNpv = expected(scenarios)
const sdNpv = Math.sqrt(scenarios.reduce((a, s) => a + s.p * (s.v - eNpv) ** 2, 0))
const sdGiven = Math.round(sdNpv * 10) / 10
const cv = sdGiven / eNpv
const downsideBeta = 1.9
const keDownside = rf + downsideBeta * mrp
const waccDownside = wD * kd + wP * kp + wE * keDownside
// Undiversified owner (slide formula U = E − ½·A·σ²): the return they need to stay as well off with the route.
const anchorReturn = 8
const anchorSd = 20
const riskAversion = 3
const routeSd = 40
const anchorUtility = anchorReturn - 0.5 * riskAversion * (anchorSd / 100) ** 2 * 100
const anchorK = anchorUtility + 0.5 * riskAversion * (routeSd / 100) ** 2 * 100
// After the risk class decision the route has to clear 10%: the base case is revalued at that rate.
const rateHigh = 10
const af10 = r4(annuityFactor(rateHigh, 3))
const df10 = r4(discountFactor(rateHigh, 3))
const baseNpv10 = Math.round((-(capex + nwc) + cf * af10 + terminal * df10) * 10) / 10
const fuelShock = [
  { name: 'Worst', p: 0.4, v: -40 },
  { name: 'Base', p: 0.4, v: baseNpv10 },
  { name: 'Best', p: 0.2, v: 50 },
]
const eNpvFuel = expected(fuelShock)
const hedgeCost = 4
const hedgedWorst = -20
const eNpvHedged = expected(fuelShock.map((s) => ({ p: s.p, v: (s.name === 'Worst' ? hedgedWorst : s.v) - hedgeCost })))

// ---------- Round 5: ESG ----------
const routeCf = 50
const carbonProb = 0.2
const carbonCut = 0.5
const rate5 = 8
const greenValue = routeCf / (rate5 / 100)
const convCf = routeCf * (1 - carbonProb * carbonCut)
const convValue = convCf / (rate5 / 100)
const rateBoom = 7.5
const rateCrisis = 8.5

const v = (x: number) => (x >= 0 ? `+${eurm(x)}` : eurm(x))

export const rounds: Round[] = [
  {
    n: 1,
    title: 'What does our money cost?',
    chapter: 'Ch. 11',
    question: 'Estimate Lufthansa’s WACC: the hurdle every project has to beat.',
    core: true,
    intro: 'Three projects are waiting for your approval. To judge them you first need Lufthansa’s cost of capital.',
    data: [
      { key: 'rf', label: 'Risk free rate (10-year Bund)', value: pct(rf, 1) },
      { key: 'mrp', label: 'Market risk premium', value: pct(mrp, 1) },
      { key: 'beta', label: 'Lufthansa beta', value: num(beta, 1) },
      { key: 'coupon', label: 'Coupon on existing 2019 bond', value: pct(coupon, 1) },
      { key: 'ytm', label: 'Yield to maturity on a new 5-year bond', value: pct(ytm, 1) },
      { key: 'tax', label: 'Tax rate', value: pct(tax * 100, 0) },
      { key: 'kp', label: 'Cost of hybrid capital (given)', value: pct(kp) },
      { key: 'dcf', label: 'Cost of equity via DCF, D1/P0 + g (given)', value: pct(dcf) },
      { key: 'rule', label: 'Cost of equity used in WACC', value: 'average of CAPM and DCF' },
      { key: 'p0', label: 'Share price / shares outstanding', value: `${eur(p0)} / ${num(sharesBn)} bn` },
      { key: 'mvDebt', label: 'Market value of debt / hybrid capital', value: `€${mvDebt} bn / €${mvHybrid} bn` },
      { key: 'bvEquity', label: 'Book value of equity', value: `€${bvEquity} bn` },
      { key: 'payables', label: 'Accounts payable', value: `€${payables} bn` },
      {
        key: 'target',
        label: 'Management target capital structure',
        value: `${wD * 100}% debt, ${wP * 100}% hybrid, ${wE * 100}% equity`,
      },
    ],
    table: {
      columns: ['Project on your desk', 'IRR'],
      rows: Object.values(projects).map((p) => [p.name, pct(p.irr)]),
    },
    tasks: [
      {
        id: 'r1.kd',
        type: 'numeric',
        unit: '%',
        formula: 'r_d(1 − T)',
        prompt: 'After tax cost of debt',
        answer: kd,
        explanation: `Use the yield on new debt, not the old coupon: ${pct(ytm, 1)} × (1 − ${num(tax, 1)}) = ${pct(kd)}.`,
      },
      {
        id: 'r1.capm',
        type: 'numeric',
        unit: '%',
        formula: 'r_f + β × market risk premium',
        prompt: 'Cost of equity via CAPM',
        answer: capm,
        explanation: `${num(rf, 1)} + ${num(beta, 1)} × ${num(mrp, 1)} = ${pct(capm)}.`,
      },
      {
        id: 'r1.wacc',
        type: 'numeric',
        unit: '%',
        formula: 'w_d r_d(1 − T) + w_p r_p + w_e r_e',
        prompt: 'WACC with target weights',
        answer: wacc,
        alternatives: [
          {
            answer: groupWaccCapm,
            points: 7,
            note: 'CAPM only: fine when there is no DCF estimate, but here you had one.',
          },
        ],
        explanation: `Cost of equity (${pct(capm)} + ${pct(dcf)}) / 2 = ${pct(ke)}. WACC = ${num(wD, 1)} × ${pct(kd)} + ${num(wP, 1)} × ${pct(kp)} + ${num(wE, 1)} × ${pct(ke)} = ${pct(wacc)}. With CAPM only: ${pct(groupWaccCapm)} (7 pts).`,
      },
      {
        id: 'r1.weights',
        type: 'choice',
        prompt: 'Which weights do you use?',
        options: [
          { id: 'A', label: `Book values (debt ${mvDebt}, hybrid ${mvHybrid}, equity ${bvEquity})`, points: 0 },
          { id: 'B', label: `Market values (equity = ${num(sharesBn)} bn × ${eur(p0)} = €${num(mvEquity, 0)} bn)`, points: 7 },
          { id: 'C', label: 'Target capital structure', points: 10 },
          { id: 'D', label: 'Include accounts payable as debt', points: 0 },
        ],
        explanation: `Target weights reflect how future projects are financed, so they come first (WACC ${pct(wacc)}). Today’s market values (debt ${pct((mvDebt / mvTotal) * 100, 0)}, hybrid ${pct((mvHybrid / mvTotal) * 100, 0)}, equity ${pct((mvEquity / mvTotal) * 100, 0)}) are a good second best when there is no target (WACC ${pct(waccMarket)}). Book values give a misleading ${pct(waccBook)}. Payables are not investor-supplied capital.`,
      },
      {
        id: 'r1.mrp',
        type: 'choice',
        prompt: `A colleague says: market risk premium = historical stock return 9% minus today’s Bund yield ${pct(rf, 1)} = ${pct(9 - rf, 1)}. Correct?`,
        options: [
          { id: 'A', label: 'Yes', points: 0 },
          { id: 'B', label: 'No, it mixes historical and current data', points: 10 },
        ],
        explanation: 'A historical market risk premium needs historical stock returns minus historical bond returns over the same period.',
      },
    ],
    reveal: `With target weights Lufthansa’s WACC is ${pct(wacc)}. This is the first hurdle for the three projects. Traps: the old coupon, book weights, and payables.`,
    discuss: 'Why would book values make Lufthansa look cheaper to finance than it really is?',
    backup: [
      'If the ECB raised rates by 1 pp tomorrow, what would happen to every hurdle rate, and to projects already approved?',
      'Lufthansa needs new equity for aircraft. Is new stock cheaper or more expensive than retained earnings? (Flotation costs.)',
    ],
  },
  {
    n: 2,
    title: 'One hurdle rate for everyone?',
    chapter: 'Ch. 11 (11-11/11-12)',
    question: 'Give each project the hurdle rate of its own risk, then decide.',
    core: true,
    intro:
      'Debt, hybrid and weights stay the same for every project. Only the cost of equity changes with the pure play beta (CAPM only, there is no DCF estimate per project).',
    data: [
      { key: 'kd', label: 'After tax cost of debt', value: pct(kd) },
      { key: 'kp', label: 'Cost of hybrid capital', value: pct(kp) },
      { key: 'weights', label: 'Target weights debt / hybrid / equity', value: `${wD * 100}% / ${wP * 100}% / ${wE * 100}%` },
      { key: 'rf', label: 'Risk free rate', value: pct(rf, 1) },
      { key: 'mrp', label: 'Market risk premium', value: pct(mrp, 1) },
    ],
    table: {
      columns: ['Project', 'Pure play beta', 'Investment', `IRR (${projectYears} years)`],
      rows: Object.values(projects).map((p) => [p.name, num(p.beta, 1), eurm(p.investment, 0), pct(p.irr)]),
    },
    tasks: [
      hurdleTask('route'),
      hurdleTask('freight'),
      hurdleTask('hangar'),
      {
        id: 'r2.decide',
        type: 'multivote',
        decision: true,
        prompt: 'Which projects do you approve? 5 pts per project called right.',
        options: [
          { id: 'route', label: `${projects.route.name} (IRR ${pct(projects.route.irr)})`, points: 0, value: routeNpv },
          { id: 'freight', label: `${projects.freight.name} (IRR ${pct(projects.freight.irr)})`, points: 0, value: freightNpv },
          { id: 'hangar', label: `${projects.hangar.name} (IRR ${pct(projects.hangar.irr)})`, points: 0, value: hangarNpv },
        ],
        explanation: `Route: IRR ${pct(projects.route.irr)} > ${pct(divisionWacc(projects.route.beta))}, NPV ${v(routeNpv)}. Freighters: IRR ${pct(projects.freight.irr)} < ${pct(divisionWacc(projects.freight.beta))}, NPV ${eurm(freightNpv)}. Hangar: IRR ${pct(projects.hangar.irr)} > ${pct(divisionWacc(projects.hangar.beta))}, NPV ${v(hangarNpv)}. The group WACC (${pct(groupWaccCapm)}) gets the freighters and the hangar wrong.`,
      },
    ],
    reveal:
      'With one group WACC, Lufthansa would buy the risky freighters and skip the safe hangar: too many risky projects, too few safe ones.',
    discuss: 'Which teams approved the freighters, and what convinced them?',
    route: { hurdle: `${pct(groupWaccCapm)} (Passenger, CAPM)`, npv: `IRR ${pct(projects.route.irr)}`, status: 'preliminary' },
    backup: [
      '“The freighters are strategic, approve them anyway,” says the Cargo CEO. When is that a valid argument? (Only if the strategic value shows up in the cash flows.)',
      'Where do pure play betas fail? (No listed pure maintenance firm, different leverage …)',
    ],
  },
  {
    n: 3,
    title: 'Which cash flows count?',
    chapter: 'Ch. 13.1–13.2',
    question: 'What is the NPV of the new long haul route?',
    core: true,
    intro: `The board wants a closer look at the long haul route before the aircraft are ordered. 3-year plan, step by step: pick the cash flows, then discount them at ${pct(rate3, 0)}.`,
    data: [
      { key: 'hurdle', label: `Hurdle rate: route WACC (${pct(groupWaccCapm)}) + 1 pp premium for a new route, rounded`, value: `≈ ${pct(rate3, 0)}` },
      { key: 'capex', label: 'Aircraft and setup, t = 0', value: eurm(capex, 0) },
      { key: 'nwc', label: 'Net operating working capital, t = 0, recovered in year 3', value: eurm(nwc, 0) },
      { key: 'ocf', label: 'Operating cash flow after tax, years 1 to 3', value: `${eurm(ocf, 0)} per year` },
      { key: 'study', label: 'Market study paid last year', value: eurm(study, 0) },
      { key: 'hangar', label: 'Hangar slot Lufthansa could rent out', value: `${eurm(hangarRent, 0)} per year after tax` },
      { key: 'cannib', label: 'Passengers taken from an existing route', value: `${eurm(cannibalization, 0)} per year after tax` },
      { key: 'interest', label: 'Interest on the loan for the aircraft', value: `${eurm(interest, 0)} per year` },
      { key: 'salvage', label: 'After tax salvage value, year 3', value: eurm(salvage, 0) },
      { key: 'af', label: `Annuity factor AF, 3 years at ${pct(rate3, 0)}: today’s value of €1 per year for 3 years`, value: num(af8, 4) },
      { key: 'df', label: `Discount factor DF, year 3 at ${pct(rate3, 0)}: today’s value of €1 in year 3`, value: num(df8, 4) },
    ],
    tasks: [
      {
        id: 'r3.check',
        type: 'checklist',
        prompt: 'Include or exclude?',
        items: [
          { id: 'study', label: 'Market study', include: false, reason: 'sunk cost' },
          { id: 'hangar', label: 'Hangar rent', include: true, reason: 'opportunity cost' },
          { id: 'cannib', label: 'Lost passengers', include: true, reason: 'cannibalization' },
          { id: 'interest', label: 'Interest', include: false, reason: 'already in the WACC' },
          { id: 'nwc', label: 'Working capital', include: true, reason: 'invested now, recovered at the end' },
        ],
        explanation: 'Only incremental cash flows count. Financing costs live in the discount rate.',
      },
      {
        id: 'r3.cf',
        type: 'numeric',
        unit: '€ m',
        formula: 'OCF − hangar rent − lost passengers',
        prompt: 'Annual cash flow CF, years 1 to 3',
        answer: cf,
        explanation: `${ocf} − ${hangarRent} − ${cannibalization} = ${eurm(cf)}.`,
      },
      {
        id: 'r3.pv',
        type: 'numeric',
        unit: '€ m',
        formula: 'CF × AF',
        prompt: 'Value today of the three annual cash flows',
        answer: pvCf,
        explanation: `${cf} × ${num(af8, 4)} = ${eurm(pvCf)}.`,
      },
      {
        id: 'r3.end',
        type: 'numeric',
        unit: '€ m',
        formula: '(salvage + NWC) × DF',
        prompt: 'Value today of what comes back in year 3',
        answer: pvEnd,
        explanation: `(${salvage} + ${nwc}) × ${num(df8, 4)} = ${eurm(pvEnd)}.`,
      },
      {
        id: 'r3.npv',
        type: 'numeric',
        unit: '€ m',
        formula: '−(capex + NWC) + PV_{cash flows} + PV_{year 3}',
        prompt: 'NPV of the route',
        answer: npv,
        explanation: `−${capex + nwc} + ${num(pvCf)} + ${num(pvEnd)} = ${eurm(npv)}. Common mistake (study and interest in, hangar and lost passengers out): ${eurm(npvWrong)}.`,
      },
      {
        id: 'r3.breakeven',
        type: 'numeric',
        unit: '€ m',
        formula: '{NPV}/{AF}',
        prompt: 'Sensitivity: by how much may the annual cash flow fall before the NPV hits zero?',
        answer: breakEven,
        explanation: `${num(npv)} / ${num(af8, 4)} = ${eurm(breakEven)} per year, only about ${pct((breakEven / ocf) * 100, 0)} of the operating cash flow.`,
      },
    ],
    reveal: `The route is worth ${eurm(npv)}: opportunity costs and cannibalization in, sunk costs and interest out.`,
    discuss: 'The market study cost real money. Why does it still not count?',
    route: { hurdle: pct(rate3, 0), npv: eurm(npv), status: 'approved' },
    backup: [
      'Should the route be charged for passengers it takes from Lufthansa’s own routes? What if a competitor would take them anyway?',
      'The NPV survives a cash flow drop of only about 10%. Which input would you stress-test first, and why?',
    ],
  },
  {
    n: 4,
    title: 'How risky is the route?',
    chapter: 'Ch. 13.3–13.8',
    question: 'Scenarios, hurdle rates, and whose risk counts.',
    core: true,
    intro: `Same route, now we test how fragile its NPV of ${eurm(npv)} is.`,
    data: [
      { key: 'sd', label: 'Standard deviation of NPV (given)', value: eurm(sdGiven, 1) },
      { key: 'avg', label: 'Coefficient of variation of the average Lufthansa project', value: '1.50' },
      { key: 'capm', label: 'Cost of equity with regular beta 1.4 (CAPM)', value: pct(capm) },
      { key: 'dbeta', label: 'Downside beta (Lufthansa falls harder than the market in downturns)', value: num(downsideBeta, 1) },
      { key: 'rfmrp', label: 'Risk free rate / market risk premium', value: `${pct(rf, 1)} / ${pct(mrp, 1)}` },
      { key: 'costs', label: 'After tax cost of debt / cost of hybrid', value: `${pct(kd)} / ${pct(kp)}` },
      { key: 'weights', label: 'Target weights debt / hybrid / equity', value: `${wD * 100}% / ${wP * 100}% / ${wE * 100}%` },
      {
        key: 'anchor',
        label: `Anchor investor (15% stake, most of their wealth): portfolio return E / volatility σ / risk aversion A`,
        value: `${pct(anchorReturn, 0)} / ${pct(anchorSd, 0)} / ${riskAversion}`,
      },
      { key: 'routesd', label: 'Volatility σ of the route’s returns', value: pct(routeSd, 0) },
      { key: 'fund', label: 'Pension fund', value: '2% stake, diversified portfolio' },
    ],
    table: {
      columns: ['Scenario', 'Probability', 'NPV'],
      rows: scenarios.map((s) => [s.name, pct(s.p * 100, 0), eurm(s.v, 1)]),
    },
    tasks: [
      {
        id: 'r4.enpv',
        type: 'numeric',
        unit: '€ m',
        formula: 'Σ p × NPV',
        prompt: 'Expected NPV',
        answer: eNpv,
        explanation: `0.25 × (−40) + 0.5 × ${num(baseNpv, 1)} + 0.25 × 50 = ${eurm(eNpv)}.`,
      },
      {
        id: 'r4.cv',
        type: 'numeric',
        unit: '',
        formula: '{σ}/{E(NPV)}',
        prompt: 'Coefficient of variation',
        answer: cv,
        tolerance: 0.05,
        explanation: `${num(sdGiven, 1)} / ${num(eNpv)} = ${num(cv)}: more than twice the average project.`,
      },
      {
        id: 'r4.hurdle',
        type: 'choice',
        prompt: 'The average project has a CV of 1.50. Which hurdle rate for the route?',
        options: [
          { id: 'A', label: 'Keep 8%', points: 0 },
          { id: 'B', label: 'Raise to 10%: high risk category', points: 10 },
          { id: 'C', label: 'Lower to 6%', points: 0 },
        ],
        explanation: 'Riskier than average projects get a higher hurdle rate.',
      },
      {
        id: 'r4.down',
        type: 'numeric',
        unit: '%',
        formula: 'w_d r_d(1 − T) + w_p r_p + w_e (r_f + β_{down} × market risk premium)',
        prompt: 'WACC of the route with downside beta',
        answer: waccDownside,
        explanation: `Cost of equity ${num(rf, 1)} + ${num(downsideBeta, 1)} × ${num(mrp, 1)} = ${pct(keDownside)}; WACC = ${num(wD, 1)} × ${pct(kd)} + ${num(wP, 1)} × ${pct(kp)} + ${num(wE, 1)} × ${pct(keDownside)} = ${pct(waccDownside)}. That is above the ${pct(rate3, 0)} from round 3: the regular beta understated how hard the route is hit in a crisis (Estrada).`,
      },
      {
        id: 'r4.anchor',
        type: 'numeric',
        unit: '%',
        formula: 'E − {1}/{2}Aσ²_{portfolio} + {1}/{2}Aσ²_{route}',
        prompt: 'Cost of capital the undiversified anchor investor demands for the route',
        answer: anchorK,
        explanation: `U = ${pct(anchorReturn, 0)} − ½ × ${riskAversion} × ${num(anchorSd / 100, 2)}² = ${pct(anchorUtility, 0)}; k = ${pct(anchorUtility, 0)} + ½ × ${riskAversion} × ${num(routeSd / 100, 2)}² = ${pct(anchorK, 0)}. The diversified pension fund only asks for the route’s hurdle rate of about ${pct(rate3, 0)}–${pct(rateHigh, 0)}.`,
      },
    ],
    event: {
      title: 'Fuel price shock',
      text: `Oil jumps overnight. The scenario probabilities shift towards the worst case, and the route is now valued at its ${pct(rateHigh, 0)} hurdle. A bank offers a fuel hedge.`,
      data: [
        { key: 'probs', label: 'New probabilities worst / base / best', value: '40% / 40% / 20%' },
        {
          key: 'npv10',
          label: `Scenario NPVs at the ${pct(rateHigh, 0)} hurdle: worst / base / best`,
          value: `${eurm(-40, 1)} / ${eurm(baseNpv10, 1)} / ${eurm(50, 1)}`,
        },
        {
          key: 'hedge',
          label: `Fuel hedge: costs ${eurm(hedgeCost, 0)}, limits the worst case to ${eurm(hedgedWorst, 0)}`,
          value: 'optional',
        },
      ],
      tasks: [
        {
          id: 'r4.e.enpv',
          type: 'numeric',
          unit: '€ m',
          formula: 'Σ p × NPV',
          prompt: 'New expected NPV, without the hedge',
          answer: eNpvFuel,
          explanation: `At ${pct(rateHigh, 0)} the base case is worth only ${eurm(baseNpv10, 1)}. 0.4 × (−40) + 0.4 × ${num(baseNpv10, 1)} + 0.2 × 50 = ${eurm(eNpvFuel)}.`,
        },
        {
          id: 'r4.e.react',
          type: 'choice',
          decision: true,
          prompt: 'How does the CFO react?',
          options: [
            { id: 'A', label: 'Go ahead as planned', points: 0, value: eNpvFuel },
            { id: 'B', label: 'Cancel the route', points: 5, value: 0 },
            { id: 'C', label: `Go ahead with the fuel hedge (${eurm(hedgeCost, 0)})`, points: 10, value: eNpvHedged },
            { id: 'D', label: 'Go ahead, but finance it with more debt to lower the WACC', points: 0, value: eNpvFuel },
          ],
          explanation: `Best: the hedge (10 pts). Cancelling avoids the loss (5 pts). Without the hedge E(NPV) is ${eurm(eNpvFuel)}. With it: 0.4 × (${hedgedWorst} − ${hedgeCost}) + 0.4 × (${num(baseNpv10, 1)} − ${hedgeCost}) + 0.2 × (50 − ${hedgeCost}) = ${v(eNpvHedged)}. More debt does not change the fuel risk, it only moves it to the shareholders.`,
        },
      ],
      explanation: 'The base case did not change, yet the decision did. Managing the risk can be worth more than accepting or rejecting.',
    },
    reveal: `The route’s CV of ${num(cv)} puts it in the high risk class: at ${pct(rateHigh, 0)} its base NPV shrinks from ${eurm(npv)} to ${eurm(baseNpv10, 1)}. With the downside beta its WACC is ${pct(waccDownside)}, not ${pct(groupWaccCapm)}. The undiversified anchor investor would even demand ${pct(anchorK, 0)}, the diversified pension fund only the market’s rate (IFM 13.8).`,
    discuss: `The anchor investor demands ${pct(anchorK, 0)}, the pension fund about ${pct(rate3, 0)}. Whose view should the CFO follow?`,
    route: { hurdle: '10% (high risk class)', npv: `E(NPV) ${eurm(eNpv)}`, status: 'under review' },
    routeAfterEvent: { hurdle: '10% (high risk class)', npv: `E(NPV) ${eurm(eNpvFuel)}`, status: 'under review' },
    routeByChoice: {
      task: 'r4.e.react',
      states: {
        A: { hurdle: '10% (high risk class)', npv: `E(NPV) ${eurm(eNpvFuel)}`, status: 'approved' },
        B: { hurdle: '10% (high risk class)', npv: '–', status: 'rejected' },
        C: { hurdle: '10% (high risk class)', npv: `E(NPV) ${v(eNpvHedged)}`, status: 'hedged' },
        D: { hurdle: '10% (high risk class)', npv: `E(NPV) ${eurm(eNpvFuel)}`, status: 'approved' },
      },
    },
    backup: [
      'Which beta should Lufthansa use for its hurdle rates, regular or downside? Why might a regular beta understate its risk in a crisis?',
      'Should Lufthansa care about corporate risk even if CAPM says only beta matters? (Bankruptcy costs, undiversified owners.)',
    ],
  },
  {
    n: 5,
    title: 'Sustainability: cash flows or cost of capital?',
    chapter: 'ESG · Edmans',
    question: 'Where does carbon risk belong in the valuation?',
    core: true,
    intro: `A sustainable aviation fuel route (“green”) and a conventional route both generate ${eurm(routeCf, 0)} per year forever. Value each one as a perpetuity: cash flow / discount rate.`,
    data: [
      { key: 'cf', label: 'Cash flow, both routes, forever', value: `${eurm(routeCf, 0)} per year` },
      { key: 'risk', label: 'Conventional route: chance that EU carbon pricing halves its cash flow', value: pct(carbonProb * 100, 0) },
      { key: 'rate', label: 'Discount rate for both routes', value: pct(rate5, 0) },
      { key: 'crisis', label: 'Discount rate if carbon pricing hits in climate crises (systematic risk)', value: pct(rateCrisis, 1) },
    ],
    tasks: [
      {
        id: 'r5.green',
        type: 'numeric',
        unit: '€ m',
        formula: '{CF}/{r}',
        prompt: `Value of the green route, discounted at ${pct(rate5, 0)}`,
        answer: greenValue,
        explanation: `${routeCf} / ${num(rate5 / 100)} = ${eurm(greenValue)}.`,
      },
      {
        id: 'r5.conv',
        type: 'numeric',
        unit: '€ m',
        formula: '{E(CF)}/{r}',
        prompt: `Value of the conventional route, discounted at ${pct(rate5, 0)}, using the expected cash flow`,
        answer: convValue,
        explanation: `Expected cash flow ${routeCf} × (1 − ${num(carbonProb, 1)} × ${num(carbonCut, 1)}) = ${eurm(convCf)}; value ${num(convCf, 0)} / ${num(rate5 / 100)} = ${eurm(convValue)}.`,
      },
      {
        id: 'r5.crisis',
        type: 'numeric',
        unit: '€ m',
        formula: `{E(CF)}/{${pct(rateCrisis, 1)}}`,
        prompt: `Carbon pricing turns out to hit in climate crises, when the whole market is down. Value the conventional route at ${pct(rateCrisis, 1)}`,
        answer: convCf / (rateCrisis / 100),
        explanation: `${num(convCf, 0)} / ${num(rateCrisis / 100, 3)} = ${eurm(convCf / (rateCrisis / 100))}. If it hit in booms instead (a hedge), the rate would be ${pct(rateBoom, 1)} and the value ${eurm(convCf / (rateBoom / 100))}.`,
      },
      {
        id: 'r5.where',
        type: 'choice',
        prompt: 'Where does the carbon risk belong?',
        options: [
          { id: 'A', label: 'Raise the discount rate', points: 5 },
          { id: 'B', label: 'Lower the expected cash flows', points: 10 },
          { id: 'C', label: 'Both, if the risk is systematic', points: 10 },
        ],
        explanation: 'Expected losses go into the cash flows. Only risk tied to bad times for investors goes into the discount rate (Edmans).',
      },
    ],
    reveal: `Green ${eurm(greenValue)} vs conventional ${eurm(convValue)}: the gap comes from expected cash flows first, the discount rate second.`,
    discuss:
      'In round 4 we raised the route’s rate for its high total risk (CV, book 13.8). Edmans says only systematic risk belongs in the rate. Who is right, and from whose point of view?',
    backup: [
      'Back to the central question: which of today’s rounds would have fooled a CFO who only looks at the WACC?',
      'Should Lufthansa use a lower discount rate for green projects in general? (Edmans: only if their cash flows are less exposed to systematic risk; the label is not a reason.)',
      'If investors accept lower returns on green assets, who gains and who loses?',
    ],
  },
]

export const roundByNumber = (n: number) => rounds.find((r) => r.n === n)

/** Handout numbering, shared by the boarding pass, the host screen and the print sheet: 1.1, 1.2 … event tasks continue. */
export function taskNumbers(round: Round): Map<string, string> {
  const all = [...round.tasks, ...(round.event?.tasks ?? [])]
  return new Map(all.map((t, i) => [t.id, `${round.n}.${i + 1}`]))
}

export const routeStart: RouteState = { hurdle: '–', npv: '–', status: 'under review' }

/**
 * The long haul route after every revealed round so far; an event in that round swaps in its outcome.
 * With `choiceOf` (a team's own answers) the team's decision on the route sets the status.
 */
export function routeStatus(
  revealedRounds: number[],
  eventRounds: number[],
  choiceOf?: (taskId: string) => string | undefined,
): RouteState {
  let state = routeStart
  for (const r of rounds) {
    if (!revealedRounds.includes(r.n)) continue
    const eventOn = eventRounds.includes(r.n)
    const next = eventOn ? (r.routeAfterEvent ?? r.route) : r.route
    if (next) state = next
    const choice = eventOn && r.routeByChoice && choiceOf?.(r.routeByChoice.task)
    if (choice && r.routeByChoice!.states[choice]) state = r.routeByChoice!.states[choice]
  }
  return state
}
