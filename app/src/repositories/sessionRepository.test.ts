import { beforeEach, describe, expect, test } from 'vitest'

import { createLocalRoomRepository } from './roomRepository'
import { createLocalSeatRepository } from './seatRepository'
import { createLocalSessionRepository } from './sessionRepository'

describe('session repository (structured mode)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('ensureSession creates round-robin order and advances turn', async () => {
    const roomRepo = createLocalRoomRepository(localStorage, { seedDemo: false })
    const room = await roomRepo.createRoom({
      title: 'Structured',
      topic: 'T',
      prompt: 'P',
      mode: 'structured',
      capacity: 5,
      participants: 0,
      aiGuardEnabled: true,
    })

    const seatRepo = createLocalSeatRepository(localStorage)
    const seat = await seatRepo.claimSeat(room.id, { displayName: 'Alice', isAnonymous: false })

    const sessionRepo = createLocalSessionRepository(localStorage)
    const session1 = await sessionRepo.ensureSession(room.id, seat)

    expect(session1.order.length).toBeGreaterThanOrEqual(3)
    expect(session1.currentSpeakerId).toBe(session1.order[0]!.id)
    expect(session1.turnSeconds).toBe(90)

    const session2 = await sessionRepo.advanceTurn(room.id)
    expect(session2.currentSpeakerId).toBe(session2.order[1]!.id)
  })

  test('ensureSession can expand to targetParticipants with AI knights', async () => {
    const roomRepo = createLocalRoomRepository(localStorage, { seedDemo: false })
    const room = await roomRepo.createRoom({
      title: 'Structured',
      topic: 'T',
      prompt: 'P',
      mode: 'structured',
      capacity: 7,
      participants: 6,
      aiGuardEnabled: true,
    })

    const seatRepo = createLocalSeatRepository(localStorage)
    const seat = await seatRepo.claimSeat(room.id, { displayName: 'Alice', isAnonymous: false })

    const sessionRepo = createLocalSessionRepository(localStorage)
    const session = await sessionRepo.ensureSession(room.id, seat, { targetParticipants: 6 })

    expect(session.order.length).toBe(6)
    expect(session.order[0]!.id).toBe(seat.id)
    expect(session.order.slice(1).every((p) => p.isBot)).toBe(true)
    expect(session.order.some((p) => p.label === 'Anonymous Knight' && p.isBot)).toBe(false)
  })

  test('setCurrentSpeaker and moveParticipant update the order and current speaker', async () => {
    const roomRepo = createLocalRoomRepository(localStorage, { seedDemo: false })
    const room = await roomRepo.createRoom({
      title: 'Structured',
      topic: 'T',
      prompt: 'P',
      mode: 'structured',
      capacity: 5,
      participants: 0,
      aiGuardEnabled: true,
    })

    const seatRepo = createLocalSeatRepository(localStorage)
    const seat = await seatRepo.claimSeat(room.id, { displayName: 'Alice', isAnonymous: false })

    const sessionRepo = createLocalSessionRepository(localStorage)
    const session = await sessionRepo.ensureSession(room.id, seat)

    const third = session.order[2]!
    const set = await sessionRepo.setCurrentSpeaker(room.id, third.id)
    expect(set.currentSpeakerId).toBe(third.id)

    const moved = await sessionRepo.moveParticipant(room.id, third.id, -1)
    expect(moved.order[1]!.id).toBe(third.id)
  })

  test('recordSpeech increments quotas and enforces maxSpeeches', async () => {
    const roomRepo = createLocalRoomRepository(localStorage, { seedDemo: false })
    const room = await roomRepo.createRoom({
      title: 'Structured',
      topic: 'T',
      prompt: 'P',
      mode: 'structured',
      capacity: 5,
      participants: 0,
      aiGuardEnabled: true,
    })

    const seatRepo = createLocalSeatRepository(localStorage)
    const seat = await seatRepo.claimSeat(room.id, { displayName: 'Alice', isAnonymous: false })

    const sessionRepo = createLocalSessionRepository(localStorage)
    await sessionRepo.ensureSession(room.id, seat)

    await sessionRepo.recordSpeech(room.id, seat.id, 8)
    await sessionRepo.recordSpeech(room.id, seat.id, 10)
    await sessionRepo.recordSpeech(room.id, seat.id, 6)

    const after = await sessionRepo.getSession(room.id)
    expect(after?.stats[seat.id]?.speeches).toBe(3)
    expect(after?.stats[seat.id]?.seconds).toBeGreaterThan(0)

    await expect(sessionRepo.recordSpeech(room.id, seat.id, 3)).rejects.toThrow(/quota/i)
  })
})
