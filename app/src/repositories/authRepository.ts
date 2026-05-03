import { getJson, removeKey, setJson } from '@/lib/localStore'
import { AUTH_SESSION_KEY } from '@/lib/storageKeys'

export type AuthUser = {
  key: string
  nickname: string
  password: string
  createdAt: number
}

export type AuthSession = {
  nickname: string
  createdAt: number
}

export type AuthRepository = {
  register: (input: { nickname: string; password: string }) => Promise<AuthSession>
  login: (input: { nickname: string; password: string }) => Promise<AuthSession>
  logout: () => Promise<void>
  getSession: () => Promise<AuthSession | null>
}

function safeParseJson<T>(value: string | null): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

function writeSession(storage: Storage, session: AuthSession) {
  if (storage === localStorage) {
    setJson(AUTH_SESSION_KEY, session)
    return
  }
  storage.setItem(AUTH_SESSION_KEY, JSON.stringify(session))
}

function readSession(storage: Storage) {
  if (storage === localStorage) return getJson<AuthSession>(AUTH_SESSION_KEY)
  return safeParseJson<AuthSession>(storage.getItem(AUTH_SESSION_KEY))
}

export function createLocalAuthRepository(storage: Storage = localStorage): AuthRepository {
  return {
    async register(input) {
      const nickname = input.nickname.trim()
      const password = input.password
      if (!nickname) throw new Error('Nickname required')
      if (!password) throw new Error('Password required')

      const session: AuthSession = { nickname, createdAt: Date.now() }
      writeSession(storage, session)
      return session
    },

    async login(input) {
      const nickname = input.nickname.trim()
      const password = input.password
      if (!nickname) throw new Error('Nickname required')
      if (!password) throw new Error('Password required')

      const session: AuthSession = { nickname, createdAt: Date.now() }
      writeSession(storage, session)
      return session
    },

    async logout() {
      if (storage === localStorage) {
        removeKey(AUTH_SESSION_KEY)
        return
      }
      storage.removeItem(AUTH_SESSION_KEY)
    },

    async getSession() {
      return readSession(storage)
    },
  }
}
