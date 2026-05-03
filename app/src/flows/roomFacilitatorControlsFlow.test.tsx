import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test } from 'vitest'

import { createLocalRoomRepository } from '@/repositories/roomRepository'
import AppRoutes from '@/AppRoutes'

beforeEach(() => {
  localStorage.clear()
})

test('room respects facilitator pause and shows prompt card + poll', async () => {
  const roomRepo = createLocalRoomRepository(localStorage, { seedDemo: false })
  const room = await roomRepo.createRoom({
    title: 'Session',
    topic: 'Topic',
    prompt: 'Prompt',
    aiGuardEnabled: true,
    capacity: 7,
    participants: 0,
  })

  localStorage.setItem(
    `rt:fac:control:${room.id}`,
    JSON.stringify({
      paused: true,
      promptCard: { id: 'p1', text: 'Try: define the term before debating it.', createdAt: Date.now() },
      poll: {
        id: 'poll1',
        question: 'Do we agree on the core claim?',
        options: ['Agree', 'Disagree', 'Unsure'],
        createdAt: Date.now(),
      },
    }),
  )

  render(
    <MemoryRouter initialEntries={[`/room/${room.id}`]}>
      <AppRoutes />
    </MemoryRouter>,
  )

  await screen.findByRole('heading', { name: /claim your seat/i })
  await userEvent.type(screen.getByRole('textbox', { name: /your name/i }), 'Alice')
  await userEvent.click(screen.getByRole('button', { name: /claim seat/i }))

  expect((await screen.findAllByText(/discussion paused/i)).length).toBeGreaterThan(0)
  expect(screen.getByText(/define the term/i)).toBeInTheDocument()
  expect(screen.getByText(/do we agree on the core claim/i)).toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: /^agree$/i }))
  expect(await screen.findByText(/your vote/i)).toBeInTheDocument()
})
