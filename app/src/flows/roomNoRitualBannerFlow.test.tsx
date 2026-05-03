import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test } from 'vitest'

import AppRoutes from '@/AppRoutes'
import { createLocalRoomRepository } from '@/repositories/roomRepository'
import { seatsKey } from '@/lib/storageKeys'

beforeEach(() => {
  localStorage.clear()
})

test('room does not show ritual banner on entry', async () => {
  const roomRepo = createLocalRoomRepository(localStorage, { seedDemo: false })
  const room = await roomRepo.createRoom({
    title: 'Session',
    topic: 'Topic',
    prompt: 'Prompt',
    capacity: 7,
    participants: 0,
  })

  localStorage.setItem(
    seatsKey(room.id),
    JSON.stringify({
      id: 'seat-1',
      roomId: room.id,
      displayName: 'Alice',
      isAnonymous: false,
      createdAt: Date.now(),
    }),
  )

  render(
    <MemoryRouter initialEntries={[`/room/${room.id}`]}>
      <AppRoutes />
    </MemoryRouter>,
  )

  await screen.findByRole('heading', { name: /session/i })
  expect(screen.queryByText(/oath of the round/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/seat granted/i)).not.toBeInTheDocument()
})

