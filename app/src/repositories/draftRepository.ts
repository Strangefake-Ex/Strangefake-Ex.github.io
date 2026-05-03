import { getJson, setJson } from '@/lib/localStore'
import { draftsKey } from '@/lib/storageKeys'

export type RoomId = string
export type SeatId = string

export type Draft = {
  id: string
  roomId: RoomId
  seatId: SeatId
  text: string
  createdAt: number
  updatedAt: number
  status: 'draft' | 'published'
  lastActivityAt: number
}

export type UpsertDraftInput = {
  roomId: RoomId
  seatId: SeatId
  text: string
}

export type DraftRepository = {
  listDrafts: (roomId: RoomId) => Promise<Draft[]>
  upsertDraft: (input: UpsertDraftInput) => Promise<Draft>
  markPublished: (draftId: string) => Promise<void>
}

function safeParseJson<T>(value: string | null): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

function createId(): string {
  const maybeCrypto = globalThis.crypto as undefined | { randomUUID?: () => string }
  if (maybeCrypto?.randomUUID) return maybeCrypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function createLocalDraftRepository(storage: Storage = localStorage): DraftRepository {
  return {
    async listDrafts(roomId) {
      const drafts =
        storage === localStorage ? (getJson<Draft[]>(draftsKey(roomId)) ?? []) : safeParseJson<Draft[]>(storage.getItem(draftsKey(roomId))) ?? []
      return [...drafts].sort((a, b) => b.updatedAt - a.updatedAt)
    },
    async upsertDraft(input) {
      const key = draftsKey(input.roomId)
      const drafts = storage === localStorage ? (getJson<Draft[]>(key) ?? []) : safeParseJson<Draft[]>(storage.getItem(key)) ?? []
      const now = Date.now()
      const existingIdx = drafts.findIndex((d) => d.roomId === input.roomId && d.seatId === input.seatId && d.status === 'draft')

      const nextDraft: Draft =
        existingIdx >= 0
          ? {
              ...drafts[existingIdx]!,
              text: input.text,
              updatedAt: now,
              lastActivityAt: now,
            }
          : {
              id: createId(),
              roomId: input.roomId,
              seatId: input.seatId,
              text: input.text,
              createdAt: now,
              updatedAt: now,
              lastActivityAt: now,
              status: 'draft',
            }

      const next = [...drafts]
      if (existingIdx >= 0) next[existingIdx] = nextDraft
      else next.unshift(nextDraft)
      if (storage === localStorage) setJson(key, next)
      else storage.setItem(key, JSON.stringify(next))
      return nextDraft
    },
    async markPublished(draftId) {
      const prefix = 'rt:drafts:'
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i)
        if (!k || !k.startsWith(prefix)) continue
        const drafts = storage === localStorage ? (getJson<Draft[]>(k) ?? []) : safeParseJson<Draft[]>(storage.getItem(k)) ?? []
        const idx = drafts.findIndex((d) => d.id === draftId)
        if (idx < 0) continue
        const next = [...drafts]
        next[idx] = { ...next[idx]!, status: 'published', updatedAt: Date.now() }
        if (storage === localStorage) setJson(k, next)
        else storage.setItem(k, JSON.stringify(next))
        return
      }
    },
  }
}
