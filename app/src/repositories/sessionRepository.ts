import type { Seat } from './seatRepository'
import type { RoomId } from './roomRepository'
import { getJson, removeKey, setJson } from '@/lib/localStore'
import { sessionKey } from '@/lib/storageKeys'

export type SessionParticipant = {
  id: string
  label: string
  isBot: boolean
}

export type StructuredSession = {
  roomId: RoomId
  order: SessionParticipant[]
  currentIndex: number
  currentSpeakerId: string
  turnSeconds: number
  turnNumber: number
  maxRounds: number
  endedAt?: number
  maxSpeeches: number
  maxSeconds: number
  stats: Record<string, { speeches: number; seconds: number }>
  turnEndsAt: number
  updatedAt: number
}

export type SessionRepository = {
  getSession: (roomId: RoomId) => Promise<StructuredSession | null>
  ensureSession: (roomId: RoomId, seat: Seat, options?: { targetParticipants?: number }) => Promise<StructuredSession>
  advanceTurn: (roomId: RoomId) => Promise<StructuredSession>
  setCurrentSpeaker: (roomId: RoomId, speakerId: string) => Promise<StructuredSession>
  moveParticipant: (roomId: RoomId, participantId: string, delta: -1 | 1) => Promise<StructuredSession>
  recordSpeech: (roomId: RoomId, speakerId: string, secondsUsed: number) => Promise<StructuredSession>
  resetSession: (roomId: RoomId) => Promise<StructuredSession | null>
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

function botName(i: number) {
  const names = ['Sir Rowan', 'Lady Nyx', 'Scholar Miro', 'Dame Elara', 'Sage Kian', 'Sir Vale']
  return names[(i - 1) % names.length]!
}

function nowMs() {
  return Date.now()
}

function computeEndsAt(turnSeconds: number) {
  return nowMs() + turnSeconds * 1000
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function persistSession(storage: Storage, roomId: RoomId, session: StructuredSession) {
  if (storage === localStorage) setJson(sessionKey(roomId), session)
  else storage.setItem(sessionKey(roomId), JSON.stringify(session))
}

function migrateSession(session: StructuredSession): StructuredSession {
  const raw = session as unknown as Record<string, unknown>
  const now = nowMs()
  const turnNumber = typeof raw.turnNumber === 'number' ? raw.turnNumber : 0
  const maxRounds = typeof raw.maxRounds === 'number' ? raw.maxRounds : 5

  let next: StructuredSession = session
  if (session.turnSeconds === 45) {
    const nextTurnSeconds = 90
    const nextTurnEndsAt = session.turnEndsAt
      ? session.turnEndsAt <= now
        ? now + nextTurnSeconds * 1000
        : session.turnEndsAt + (nextTurnSeconds - session.turnSeconds) * 1000
      : now + nextTurnSeconds * 1000
    next = { ...next, turnSeconds: nextTurnSeconds, turnEndsAt: nextTurnEndsAt, updatedAt: now }
  }
  if ((next as unknown as Record<string, unknown>).turnNumber !== turnNumber || (next as unknown as Record<string, unknown>).maxRounds !== maxRounds) {
    next = { ...next, turnNumber, maxRounds, updatedAt: now }
  }
  return next
}

function ensureStats(
  base: Record<string, { speeches: number; seconds: number }> | undefined,
  order: SessionParticipant[],
) {
  const next: Record<string, { speeches: number; seconds: number }> = { ...(base ?? {}) }
  for (const p of order) {
    if (!next[p.id]) next[p.id] = { speeches: 0, seconds: 0 }
  }
  return next
}

export function createLocalSessionRepository(storage: Storage = localStorage): SessionRepository {
  return {
    async getSession(roomId) {
      const existing =
        storage === localStorage ? getJson<StructuredSession>(sessionKey(roomId)) : safeParseJson<StructuredSession>(storage.getItem(sessionKey(roomId)))
      if (!existing) return null
      const migrated = migrateSession(existing)
      if (migrated !== existing) persistSession(storage, roomId, migrated)
      return migrated
    },
    async ensureSession(roomId, seat, options) {
      const existingRaw =
        storage === localStorage ? getJson<StructuredSession>(sessionKey(roomId)) : safeParseJson<StructuredSession>(storage.getItem(sessionKey(roomId)))
      const existing = existingRaw ? migrateSession(existingRaw) : null
      if (existing && existingRaw && existing !== existingRaw) persistSession(storage, roomId, existing)
      if (existing && existing.order.some((p) => p.id === seat.id)) return existing

      const turnSeconds = existing?.turnSeconds ?? 90
      const turnNumber = existing?.turnNumber ?? 0
      const maxRounds = existing?.maxRounds ?? 5
      const maxSpeeches = existing?.maxSpeeches ?? 3
      const maxSeconds = existing?.maxSeconds ?? 180
      const targetParticipants = Math.max(2, Math.round(options?.targetParticipants ?? 3))
      const baseOrder: SessionParticipant[] = existing?.order?.length
        ? existing.order
        : [
            {
              id: seat.id,
              label: seat.isAnonymous ? 'Anonymous Knight' : seat.displayName,
              isBot: false,
            },
          ]

      if (!baseOrder.some((p) => p.id === seat.id)) {
        baseOrder.unshift({
          id: seat.id,
          label: seat.isAnonymous ? 'Anonymous Knight' : seat.displayName,
          isBot: false,
        })
      }

      let botIdx = 0
      for (let i = 0; i < baseOrder.length; i++) {
        const p = baseOrder[i]!
        if (p.id === seat.id) {
          baseOrder[i] = { ...p, label: seat.isAnonymous ? 'Anonymous Knight' : seat.displayName, isBot: false }
          continue
        }
        if (!p.isBot && p.label !== 'Anonymous Knight') {
          baseOrder[i] = { ...p, isBot: true }
          continue
        }
        if (p.isBot && p.label === 'Anonymous Knight') {
          botIdx += 1
          baseOrder[i] = { ...p, label: botName(botIdx), isBot: true }
          continue
        }
        if (p.isBot) botIdx += 1
      }

      while (baseOrder.length < targetParticipants) {
        baseOrder.push({ id: createId(), label: botName(baseOrder.length), isBot: true })
      }

      const next: StructuredSession = {
        roomId,
        order: baseOrder,
        currentIndex: existing?.currentIndex ?? 0,
        currentSpeakerId: existing?.currentSpeakerId ?? baseOrder[0]!.id,
        turnSeconds,
        turnNumber,
        maxRounds,
        endedAt: existing?.endedAt,
        maxSpeeches,
        maxSeconds,
        stats: ensureStats(existing?.stats, baseOrder),
        turnEndsAt: existing?.turnEndsAt ?? computeEndsAt(turnSeconds),
        updatedAt: nowMs(),
      }

      persistSession(storage, roomId, next)
      return next
    },
    async advanceTurn(roomId) {
      const existingRaw =
        storage === localStorage ? getJson<StructuredSession>(sessionKey(roomId)) : safeParseJson<StructuredSession>(storage.getItem(sessionKey(roomId)))
      if (!existingRaw || existingRaw.order.length === 0) throw new Error('Session not started')
      const existing = migrateSession(existingRaw)
      if (existing !== existingRaw) persistSession(storage, roomId, existing)
      if (existing.endedAt) return existing

      const maxTurns = Math.max(1, existing.order.length * (existing.maxRounds || 5))
      if ((existing.turnNumber ?? 0) >= maxTurns - 1) {
        const now = nowMs()
        const ended: StructuredSession = { ...existing, endedAt: now, turnEndsAt: now, updatedAt: now }
        persistSession(storage, roomId, ended)
        return ended
      }

      const nextIndex = (existing.currentIndex + 1) % existing.order.length
      const next: StructuredSession = {
        ...existing,
        currentIndex: nextIndex,
        currentSpeakerId: existing.order[nextIndex]!.id,
        turnNumber: (existing.turnNumber ?? 0) + 1,
        turnEndsAt: computeEndsAt(existing.turnSeconds),
        updatedAt: nowMs(),
      }
      persistSession(storage, roomId, next)
      return next
    },
    async setCurrentSpeaker(roomId, speakerId) {
      const existingRaw =
        storage === localStorage ? getJson<StructuredSession>(sessionKey(roomId)) : safeParseJson<StructuredSession>(storage.getItem(sessionKey(roomId)))
      if (!existingRaw || existingRaw.order.length === 0) throw new Error('Session not started')
      const existing = migrateSession(existingRaw)
      if (existing !== existingRaw) persistSession(storage, roomId, existing)
      const idx = existing.order.findIndex((p) => p.id === speakerId)
      if (idx < 0) throw new Error('Speaker not found')
      const next: StructuredSession = {
        ...existing,
        currentIndex: idx,
        currentSpeakerId: speakerId,
        turnEndsAt: computeEndsAt(existing.turnSeconds),
        updatedAt: nowMs(),
      }
      persistSession(storage, roomId, next)
      return next
    },
    async moveParticipant(roomId, participantId, delta) {
      const existingRaw =
        storage === localStorage ? getJson<StructuredSession>(sessionKey(roomId)) : safeParseJson<StructuredSession>(storage.getItem(sessionKey(roomId)))
      if (!existingRaw || existingRaw.order.length === 0) throw new Error('Session not started')
      const existing = migrateSession(existingRaw)
      if (existing !== existingRaw) persistSession(storage, roomId, existing)
      const idx = existing.order.findIndex((p) => p.id === participantId)
      if (idx < 0) throw new Error('Participant not found')
      const to = clamp(idx + delta, 0, existing.order.length - 1)
      if (to === idx) return existing

      const order = [...existing.order]
      const [item] = order.splice(idx, 1)
      order.splice(to, 0, item!)

      const nextIndex = existing.currentSpeakerId === participantId ? to : order.findIndex((p) => p.id === existing.currentSpeakerId)
      const next: StructuredSession = {
        ...existing,
        order,
        currentIndex: Math.max(0, nextIndex),
        stats: ensureStats(existing.stats, order),
        updatedAt: nowMs(),
      }
      persistSession(storage, roomId, next)
      return next
    },
    async recordSpeech(roomId, speakerId, secondsUsed) {
      const existingRaw =
        storage === localStorage ? getJson<StructuredSession>(sessionKey(roomId)) : safeParseJson<StructuredSession>(storage.getItem(sessionKey(roomId)))
      if (!existingRaw) throw new Error('Session not started')
      const existing = migrateSession(existingRaw)
      if (existing !== existingRaw) persistSession(storage, roomId, existing)
      const stats = ensureStats(existing.stats, existing.order)
      const entry = stats[speakerId] ?? { speeches: 0, seconds: 0 }
      if (entry.speeches >= existing.maxSpeeches) throw new Error('Quota exceeded')
      if (entry.seconds >= existing.maxSeconds) throw new Error('Quota exceeded')

      const incSeconds = clamp(Math.round(secondsUsed), 0, existing.turnSeconds)
      const nextEntry = {
        speeches: entry.speeches + 1,
        seconds: Math.min(existing.maxSeconds, entry.seconds + incSeconds),
      }
      if (nextEntry.speeches > existing.maxSpeeches || nextEntry.seconds > existing.maxSeconds) throw new Error('Quota exceeded')

      const next: StructuredSession = {
        ...existing,
        stats: { ...stats, [speakerId]: nextEntry },
        updatedAt: nowMs(),
      }
      persistSession(storage, roomId, next)
      return next
    },
    async resetSession(roomId) {
      if (storage === localStorage) removeKey(sessionKey(roomId))
      else storage.removeItem(sessionKey(roomId))
      return null
    },
  }
}
