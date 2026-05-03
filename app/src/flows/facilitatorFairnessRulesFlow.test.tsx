import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test } from 'vitest'

import { createLocalPostRepository } from '@/repositories/postRepository'
import { createLocalRoomRepository } from '@/repositories/roomRepository'
import AppRoutes from '@/AppRoutes'

beforeEach(() => {
  localStorage.clear()
})

test('facilitator uses per-room fairness thresholds for alerts', async () => {
  const roomRepo = createLocalRoomRepository(localStorage, { seedDemo: false })
  const postRepo = createLocalPostRepository(localStorage)
  const room = await roomRepo.createRoom({
    title: 'Session',
    topic: 'Topic',
    prompt: 'Prompt',
    aiGuardEnabled: true,
    capacity: 7,
    participants: 1,
  })

  for (let i = 0; i < 12; i++) {
    await postRepo.createPost(room.id, { authorId: 'u1', authorLabel: 'Alice', content: `Hello ${i}` })
  }
  await postRepo.createPost(room.id, { authorId: 'u2', authorLabel: 'Bob', content: 'Counterpoint' })

  localStorage.setItem(
    `rt:fac:rules:${room.id}`,
    JSON.stringify({
      silenceSeconds: 999,
      dominanceSharePct: 99,
      consecutivePosts: 99,
    }),
  )

  render(
    <MemoryRouter initialEntries={[`/facilitator/${room.id}`]}>
      <AppRoutes />
    </MemoryRouter>,
  )

  await screen.findByText(/facilitator's helm/i)
  await screen.findAllByText(/guardian alerts/i)
  await expect(screen.findByText(/participation imbalance/i)).rejects.toThrow()
})
