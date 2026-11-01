export type Unit = '%' | '€ m' | ''

export interface Option {
  id: string
  label: string
  points: number
  /** Decisions only: value created for Lufthansa in € m when a team picks this option. */
  value?: number
}

export interface ChecklistItem {
  id: string
  label: string
  include: boolean
  reason: string
}

interface TaskBase {
  id: string
  prompt: string
  explanation: string
}

export interface NumericTask extends TaskBase {
  type: 'numeric'
  unit: Unit
  answer: number
  /** Full points within ± tolerance, half points within ± 3 × tolerance. */
  tolerance?: number
  decimals?: number
  /** Shown left of the input field, in the mini syntax of <Formula>: "r_d(1 − T)", "{σ}/{E(NPV)}". */
  formula?: string
  /** Defensible other answers that earn partial points, e.g. a WACC with CAPM only. */
  alternatives?: { answer: number; points: number; note: string }[]
}

export interface ChoiceTask extends TaskBase {
  type: 'choice'
  options: Option[]
  /** A project decision: no points, the chosen option's value counts instead. */
  decision?: boolean
}

export interface ChecklistTask extends TaskBase {
  type: 'checklist'
  items: ChecklistItem[]
}

/** Collected for the bar chart only, never scored. */
export interface DiscussionTask extends TaskBase {
  type: 'discussion'
  options: Option[]
}

/** Pick any number of options; the value is a JSON array of option ids. A decision adds up the picked values. */
export interface MultiVoteTask extends TaskBase {
  type: 'multivote'
  options: Option[]
  decision?: boolean
}

export type Task = NumericTask | ChoiceTask | ChecklistTask | DiscussionTask | MultiVoteTask

export interface DataRow {
  key: string
  label: string
  value: string
}

export interface DataTable {
  columns: string[]
  rows: string[][]
}

export interface RoundEvent {
  title: string
  text: string
  /** Rows with an existing key replace that row (highlighted), new keys are appended. */
  data: DataRow[]
  tasks: Task[]
  explanation: string
}

/** Where the long haul route stands after a round's reveal. */
export interface RouteState {
  hurdle: string
  npv: string
  status: 'approved' | 'preliminary' | 'under review' | 'hedged' | 'rejected'
}

export interface Round {
  n: number
  title: string
  /** Chapter in the course book, shown with the round title. */
  chapter: string
  question: string
  /** Core rounds are the ones to play when time runs short. */
  core: boolean
  intro?: string
  data: DataRow[]
  table?: DataTable
  tasks: Task[]
  event?: RoundEvent
  reveal: string
  /** The one question for the room, shown on the host screen after the reveal. */
  discuss: string
  /** Spare questions if there is time left. */
  backup?: string[]
  /** Route status after the reveal, and instead after an event in this round. */
  route?: RouteState
  routeAfterEvent?: RouteState
  /** A team's answer to this decision sets the route status on its boarding pass. */
  routeByChoice?: { task: string; states: Record<string, RouteState> }
}
