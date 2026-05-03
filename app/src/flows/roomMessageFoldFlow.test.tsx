import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test } from 'vitest'

import AppRoutes from '@/AppRoutes'
import { createLocalPostRepository } from '@/repositories/postRepository'
import { createLocalRoomRepository } from '@/repositories/roomRepository'

beforeEach(() => {
  localStorage.clear()
})

test('room folds long message list and can reveal older messages', async () => {
  const roomRepo = createLocalRoomRepository(localStorage, { seedDemo: false })
  const postRepo = createLocalPostRepository(localStorage)
  const room = await roomRepo.createRoom({
    title: 'Long Room',
    topic: 'T',
    prompt: 'P',
    mode: 'freeForm',
    aiGuardEnabled: false,
    capacity: 7,
    participants: 1,
  })

  for (let i = 0; i < 60; i++) {
    await postRepo.createPost(room.id, { authorId: 'u1', authorLabel: 'Alice', content: `Message ${i}` })
  }

  render(
    <MemoryRouter initialEntries={[`/room/${room.id}`]}>
      <AppRoutes />
    </MemoryRouter>,
  )

  await screen.findByRole('heading', { name: /claim your seat/i })
  await userEvent.type(screen.getByRole('textbox', { name: /your name/i }), 'Alice')
  await userEvent.click(screen.getByRole('button', { name: /claim seat/i }))

  expect(await screen.findByText(/showing latest/i)).toBeInTheDocument()
  expect(screen.queryByText(/message 0/i)).not.toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: /show all messages/i }))
  expect(await screen.findByText(/message 0/i)).toBeInTheDocument()
})

