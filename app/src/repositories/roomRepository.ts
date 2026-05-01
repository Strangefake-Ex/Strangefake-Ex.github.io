import { getJson, setJson } from '@/lib/localStore'
import { ROOMS_KEY, SEEDED_ROOMS_KEY } from '@/lib/storageKeys'

export type RoomId = string

export type DiscussionMode = 'structured' | 'freeForm'
export type SecurityLevel = 'fortified' | 'guarded' | 'open'

export type Room = {
  id: RoomId
  title: string
  course?: string
  topic: string
  prompt: string
  mode: DiscussionMode
  security: SecurityLevel
  shieldStrength: number
  aiGuardEnabled: boolean
  capacity: number
  participants: number
  tags: string[]
  createdAt: number
  facilitatorCode?: string
}

export type CreateRoomInput = {
  title: string
  course?: string
  topic?: string
  prompt: string
  mode?: DiscussionMode
  security?: SecurityLevel
  shieldStrength?: number
  aiGuardEnabled?: boolean
  capacity?: number
  participants?: number
  tags?: string[]
  facilitatorCode?: string
}

export type RoomRepository = {
  listRooms: () => Promise<Room[]>
  createRoom: (input: CreateRoomInput) => Promise<Room>
  getRoom: (roomId: RoomId) => Promise<Room | null>
  findRoomByFacilitatorCode: (code: string) => Promise<Room | null>
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

function createFacilitatorCode(seed: string) {
  const raw = `${seed}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  return raw.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 6)
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function seedRooms(): Room[] {
  const now = Date.now()
  return [
    {
      id: '1',
      title: 'The Council of Ideas',
      topic: 'Philosophy of Mind & Consciousness',
      prompt: 'What makes an idea feel “safe” to share in a seminar?',
      mode: 'structured',
      security: 'fortified',
      shieldStrength: 85,
      aiGuardEnabled: true,
      capacity: 7,
      participants: 5,
      tags: ['#REGULATION', '#PHENOMENOLOGY', '#PRACTICAL'],
      facilitatorCode: createFacilitatorCode('1'),
      createdAt: now - 1000 * 60 * 60,
    },
    {
      id: '2',
      title: 'Chamber of Ethics',
      topic: 'AI Ethics in Modern Academia',
      prompt: 'Where should we draw the line between assistance and replacement?',
      mode: 'structured',
      security: 'fortified',
      shieldStrength: 80,
      aiGuardEnabled: true,
      capacity: 6,
      participants: 3,
      tags: ['#ACCOUNTABILITY', '#FAIRNESS', '#EDUCATION'],
      facilitatorCode: createFacilitatorCode('2'),
      createdAt: now - 1000 * 60 * 65,
    },
    {
      id: '3',
      title: 'The Great Dialogue',
      topic: 'Seminar Dynamics & Participation',
      prompt: 'How do we avoid an “echo chamber” in class discussions?',
      mode: 'freeForm',
      security: 'guarded',
      shieldStrength: 72,
      aiGuardEnabled: false,
      capacity: 8,
      participants: 4,
      tags: ['#EQUITY', '#TURNTAKING', '#INCLUSION'],
      facilitatorCode: createFacilitatorCode('3'),
      createdAt: now - 1000 * 60 * 70,
    },
    {
      id: '4',
      title: "Scholar's Circle",
      topic: 'Writing, Language & Confidence',
      prompt: 'What scaffolding helps non-native speakers contribute more?',
      mode: 'structured',
      security: 'guarded',
      shieldStrength: 76,
      aiGuardEnabled: true,
      capacity: 10,
      participants: 7,
      tags: ['#ESL', '#FACE_SAVING', '#FLOW'],
      facilitatorCode: createFacilitatorCode('4'),
      createdAt: now - 1000 * 60 * 75,
    },
    {
      id: '5',
      title: 'The Open Forum',
      topic: 'Free Thoughts & Curiosity',
      prompt: 'Share a question you are afraid to ask out loud.',
      mode: 'freeForm',
      security: 'open',
      shieldStrength: 60,
      aiGuardEnabled: false,
      capacity: 12,
      participants: 2,
      tags: ['#OPEN', '#CURIOUS', '#LOW_STAKES'],
      facilitatorCode: createFacilitatorCode('5'),
      createdAt: now - 1000 * 60 * 80,
    },
    {
      id: '6',
      title: "Knight's Assembly",
      topic: 'Debate & Counterarguments',
      prompt: 'How do we disagree without shutting others down?',
      mode: 'freeForm',
      security: 'fortified',
      shieldStrength: 88,
      aiGuardEnabled: true,
      capacity: 9,
      participants: 6,
      tags: ['#DEBATE', '#RESPECT', '#EVIDENCE'],
      facilitatorCode: createFacilitatorCode('6'),
      createdAt: now - 1000 * 60 * 85,
    },
  ]
}

function ensureFacilitatorCodes(storage: Storage, rooms: Room[]) {
  let changed = false
  const next = rooms.map((r) => {
    if (r.facilitatorCode) return r
    changed = true
    return { ...r, facilitatorCode: createFacilitatorCode(r.id) }
  })
  if (!changed) return rooms
  if (storage === localStorage) setJson(ROOMS_KEY, next)
  else storage.setItem(ROOMS_KEY, JSON.stringify(next))
  return next
}

function normalizeFacilitatorCode(code: string) {
  return code.trim().replace(/\s+/g, '').toUpperCase()
}

function ensureSeedRooms(storage: Storage) {
  const seeded = storage.getItem(SEEDED_ROOMS_KEY) === '1'
  const existing = storage === localStorage ? getJson<Room[]>(ROOMS_KEY) : safeParseJson<Room[]>(storage.getItem(ROOMS_KEY))
  if (seeded || (existing && existing.length > 0)) return
  if (storage === localStorage) setJson(ROOMS_KEY, seedRooms())
  else storage.setItem(ROOMS_KEY, JSON.stringify(seedRooms()))
  storage.setItem(SEEDED_ROOMS_KEY, '1')
}

export function createLocalRoomRepository(
  storage: Storage = localStorage,
  options?: { seedDemo?: boolean },
): RoomRepository {
  const seedDemo = options?.seedDemo ?? true
  if (seedDemo) ensureSeedRooms(storage)

  return {
    async listRooms() {
      const rooms = storage === localStorage ? getJson<Room[]>(ROOMS_KEY) ?? [] : safeParseJson<Room[]>(storage.getItem(ROOMS_KEY)) ?? []
      const next = ensureFacilitatorCodes(storage, rooms)
      return [...next].sort((a, b) => b.createdAt - a.createdAt)
    },
    async createRoom(input) {
      const existing = storage === localStorage ? getJson<Room[]>(ROOMS_KEY) ?? [] : safeParseJson<Room[]>(storage.getItem(ROOMS_KEY)) ?? []
      const id = createId()
      const room: Room = {
        id,
        title: input.title,
        course: input.course,
        topic: input.topic ?? input.course ?? 'Round Table',
        prompt: input.prompt,
        mode: input.mode ?? 'freeForm',
        security: input.security ?? 'guarded',
        shieldStrength: clamp(input.shieldStrength ?? 78, 0, 100),
        aiGuardEnabled: input.aiGuardEnabled ?? true,
        capacity: clamp(input.capacity ?? 7, 2, 40),
        participants: clamp(input.participants ?? 1, 0, 40),
        tags: input.tags ?? [],
        facilitatorCode: input.facilitatorCode ?? createFacilitatorCode(id),
        createdAt: Date.now(),
      }
      const next = [room, ...existing]
      if (storage === localStorage) setJson(ROOMS_KEY, next)
      else storage.setItem(ROOMS_KEY, JSON.stringify(next))
      return room
    },
    async getRoom(roomId) {
      const rooms = storage === localStorage ? getJson<Room[]>(ROOMS_KEY) ?? [] : safeParseJson<Room[]>(storage.getItem(ROOMS_KEY)) ?? []
      const next = ensureFacilitatorCodes(storage, rooms)
      return next.find((r) => r.id === roomId) ?? null
    },
    async findRoomByFacilitatorCode(code) {
      const normalized = normalizeFacilitatorCode(code)
      if (!normalized) return null
      const rooms = storage === localStorage ? getJson<Room[]>(ROOMS_KEY) ?? [] : safeParseJson<Room[]>(storage.getItem(ROOMS_KEY)) ?? []
      const next = ensureFacilitatorCodes(storage, rooms)
      return next.find((r) => normalizeFacilitatorCode(r.facilitatorCode ?? '') === normalized) ?? null
    },
  }
}
