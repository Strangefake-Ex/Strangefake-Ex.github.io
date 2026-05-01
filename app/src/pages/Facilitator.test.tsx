import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test } from 'vitest'

import { createLocalPostRepository } from '@/repositories/postRepository'
import { createLocalRoomRepository } from '@/repositories/roomRepository'
import AppRoutes from '@/AppRoutes'

beforeEach(() => {
  localStorage.clear()
})

test('facilitator shows helm metrics and alerts', async () => {
  const roomRepo = createLocalRoomRepository(localStorage, { seedDemo: false })
  const postRepo = createLocalPostRepository(localStorage)
  const room = await roomRepo.createRoom({
    title: 'Session',
    topic: 'T',
    prompt: 'P',
    aiGuardEnabled: true,
    capacity: 7,
    participants: 1,
  })
  await postRepo.createPost(room.id, { authorId: 'u1', authorLabel: 'Alice', content: 'Hello' })

  render(
    <MemoryRouter initialEntries={[`/facilitator/${room.id}`]}>
      <AppRoutes />
    </MemoryRouter>,
  )

  expect(await screen.findByText(/facilitator's helm/i)).toBeInTheDocument()
  expect(screen.getAllByText(/guardian alerts/i).length).toBeGreaterThan(0)
  expect(screen.getByText(/contribution heatmap/i)).toBeInTheDocument()
})
