import { beforeEach, describe, expect, test } from 'vitest'

import { createLocalRoomRepository } from './roomRepository'

describe('seed rooms', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('listRooms returns demo chambers when storage is empty', async () => {
    const repo = createLocalRoomRepository()
    const rooms = await repo.listRooms()

    expect(rooms.length).toBeGreaterThanOrEqual(6)
    expect(rooms[0]?.title.length).toBeGreaterThan(0)
  })
})

