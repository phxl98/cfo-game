// Small wrappers so a blocked or private-mode localStorage never breaks the game.

export interface TeamSession {
  teamId: string
  gameId: string
  name: string
  code: string
}

function get<T>(store: Storage | undefined, key: string): T | null {
  try {
    const raw = store?.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function set(store: Storage | undefined, key: string, value: unknown) {
  try {
    if (value === null) store?.removeItem(key)
    else store?.setItem(key, JSON.stringify(value))
  } catch {
    // ignore
  }
}

const local = typeof localStorage !== 'undefined' ? localStorage : undefined
const session = typeof sessionStorage !== 'undefined' ? sessionStorage : undefined

export const teamSession = {
  get: () => get<TeamSession>(local, 'cfo-team'),
  set: (v: TeamSession | null) => set(local, 'cfo-team', v),
}

export const hostPin = {
  get: () => get<string>(session, 'cfo-host-pin'),
  set: (v: string | null) => set(session, 'cfo-host-pin', v),
}

export const hostGame = {
  get: () => get<string>(local, 'cfo-host-game'),
  set: (v: string | null) => set(local, 'cfo-host-game', v),
}
