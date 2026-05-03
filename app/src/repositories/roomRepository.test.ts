import { beforeEach, describe, expect, test } from 'vitest'

import { createLocalRoomRepository } from './roomRepository'

describe('createLocalRoomRepository', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('createRoom persists and can be listed and retrieved', async () => {
    const repo = createLocalRoomRepository(localStorage, { seedDemo: false })

    const created = await repo.createRoom({
      title: 'Seminar 6',
      course: 'HCI',
      topic: 'Human Computer Interaction',
      prompt: 'How can AI reduce face-saving anxiety in seminars?',
      mode: 'freeForm',
      security: 'guarded',
      aiGuardEnabled: true,
      capacity: 7,
      participants: 1,
    })

    expect(typeof created.id).toBe('string')
    expect(created.id.length).toBeGreaterThan(0)

    const rooms = await repo.listRooms()
    expect(rooms).toHaveLength(1)
    expect(rooms[0]).toEqual(created)

    const found = await repo.getRoom(created.id)
    expect(found).toEqual(created)
  })

  test('createRoom generates a facilitator code when missing', async () => {
    const repo = createLocalRoomRepository(localStorage, { seedDemo: false })

    const created = await repo.createRoom({
      title: 'Seminar 6',
      topic: 'Topic',
      prompt: 'Prompt',
      capacity: 7,
      participants: 0,
    })

    expect(typeof created.facilitatorCode).toBe('string')
    expect(created.facilitatorCode?.length).toBeGreaterThan(0)
  })

  test('getRoom backfills missing facilitator codes', async () => {
    localStorage.setItem(
      'rt:rooms',
      JSON.stringify([
        {
          id: 'room-1',
          title: 'Session',
          topic: 'Topic',
          prompt: 'Prompt',
          mode: 'freeForm',
          security: 'guarded',
          shieldStrength: 78,
          aiGuardEnabled: true,
          capacity: 7,
          participants: 0,
          tags: [],
          createdAt: Date.now(),
        },
      ]),
    )

    const repo = createLocalRoomRepository(localStorage, { seedDemo: false })
    const found = await repo.getRoom('room-1')
    expect(found?.facilitatorCode?.length).toBeGreaterThan(0)
  })
})
