import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test } from 'vitest'

import { createLocalPostRepository } from '@/repositories/postRepository'
import { createLocalRoomRepository } from '@/repositories/roomRepository'
import AppRoutes from '@/AppRoutes'

beforeEach(() => {
  localStorage.clear()
})

test('profile shows chronicle stats and recent chambers', async () => {
  const roomRepo = createLocalRoomRepository(localStorage, { seedDemo: false })
  const postRepo = createLocalPostRepository(localStorage)
  const room = await roomRepo.createRoom({
    title: 'My Chamber',
    topic: 'T',
    prompt: 'P',
    aiGuardEnabled: true,
    capacity: 7,
    participants: 1,
  })
  await postRepo.createPost(room.id, {
    authorId: 'u1',
    authorLabel: 'Alice',
    content: 'Hello world',
  })

  render(
    <MemoryRouter initialEntries={['/profile']}>
      <AppRoutes />
    </MemoryRouter>,
  )

  expect(await screen.findByRole('heading', { name: /your knight's chronicle/i })).toBeInTheDocument()
  expect(screen.getByText(/total speeches/i)).toBeInTheDocument()
  expect(await screen.findByText(/my chamber/i)).toBeInTheDocument()
})
