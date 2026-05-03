import { beforeEach, describe, expect, test } from 'vitest'

import { createLocalRoomRepository } from './roomRepository'
import { createLocalSeatRepository } from './seatRepository'

describe('seat repository', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('claimSeat stores seat and increments participants (up to capacity)', async () => {
    const roomRepo = createLocalRoomRepository(localStorage, { seedDemo: false })
    const room = await roomRepo.createRoom({
      title: 'Demo',
      topic: 'T',
      prompt: 'P',
      capacity: 2,
      participants: 0,
      aiGuardEnabled: true,
    })

    const seatRepo = createLocalSeatRepository(localStorage)
    const seat = await seatRepo.claimSeat(room.id, { displayName: 'Alice', isAnonymous: false })
    expect(seat.displayName).toBe('Alice')

    const fetchedSeat = await seatRepo.getSeat(room.id)
    expect(fetchedSeat).toEqual(seat)

    const after1 = await roomRepo.getRoom(room.id)
    expect(after1?.participants).toBe(1)

    await seatRepo.releaseSeat(room.id)
    const afterRelease = await roomRepo.getRoom(room.id)
    expect(afterRelease?.participants).toBe(0)

    const fullRoom = await roomRepo.createRoom({
      title: 'Full',
      topic: 'T',
      prompt: 'P',
      capacity: 2,
      participants: 2,
      aiGuardEnabled: true,
    })

    await expect(seatRepo.claimSeat(fullRoom.id, { displayName: 'C', isAnonymous: false })).rejects.toThrow(/full/i)
  })
})
