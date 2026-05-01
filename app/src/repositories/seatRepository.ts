import type { Room, RoomId } from './roomRepository'
import { getJson, removeKey, setJson } from '@/lib/localStore'
import { ROOMS_KEY, seatsKey } from '@/lib/storageKeys'

export type Seat = {
  id: string
  roomId: RoomId
  displayName: string
  isAnonymous: boolean
  createdAt: number
}

export type ClaimSeatInput = {
  displayName: string
  isAnonymous: boolean
}

export type SeatRepository = {
  getSeat: (roomId: RoomId) => Promise<Seat | null>
  claimSeat: (roomId: RoomId, input: ClaimSeatInput) => Promise<Seat>
  releaseSeat: (roomId: RoomId) => Promise<void>
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

function updateRoom(storage: Storage, roomId: RoomId, update: (r: Room) => Room) {
  const rooms = storage === localStorage ? getJson<Room[]>(ROOMS_KEY) ?? [] : safeParseJson<Room[]>(storage.getItem(ROOMS_KEY)) ?? []
  const idx = rooms.findIndex((r) => r.id === roomId)
  if (idx < 0) return
  const next = [...rooms]
  next[idx] = update(next[idx]!)
  if (storage === localStorage) setJson(ROOMS_KEY, next)
  else storage.setItem(ROOMS_KEY, JSON.stringify(next))
}

export function createLocalSeatRepository(storage: Storage = localStorage): SeatRepository {
  return {
    async getSeat(roomId) {
      return storage === localStorage ? getJson<Seat>(seatsKey(roomId)) : safeParseJson<Seat>(storage.getItem(seatsKey(roomId)))
    },
    async claimSeat(roomId, input) {
      const existingSeat = storage === localStorage ? getJson<Seat>(seatsKey(roomId)) : safeParseJson<Seat>(storage.getItem(seatsKey(roomId)))
      if (existingSeat) return existingSeat

      const rooms = storage === localStorage ? getJson<Room[]>(ROOMS_KEY) ?? [] : safeParseJson<Room[]>(storage.getItem(ROOMS_KEY)) ?? []
      const room = rooms.find((r) => r.id === roomId)
      if (!room) throw new Error('Room not found')
      if (room.participants >= room.capacity) throw new Error('Chamber is full')

      const seat: Seat = {
        id: createId(),
        roomId,
        displayName: input.displayName.trim() || 'Knight',
        isAnonymous: input.isAnonymous,
        createdAt: Date.now(),
      }

      if (storage === localStorage) setJson(seatsKey(roomId), seat)
      else storage.setItem(seatsKey(roomId), JSON.stringify(seat))

      updateRoom(storage, roomId, (r) => ({
        ...r,
        participants: Math.min(r.capacity, r.participants + 1),
      }))

      return seat
    },
    async releaseSeat(roomId) {
      const existingSeat = storage === localStorage ? getJson<Seat>(seatsKey(roomId)) : safeParseJson<Seat>(storage.getItem(seatsKey(roomId)))
      if (!existingSeat) return
      if (storage === localStorage) removeKey(seatsKey(roomId))
      else storage.removeItem(seatsKey(roomId))
      updateRoom(storage, roomId, (r) => ({
        ...r,
        participants: Math.max(0, r.participants - 1),
      }))
    },
  }
}
