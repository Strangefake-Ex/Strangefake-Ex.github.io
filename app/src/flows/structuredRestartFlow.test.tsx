import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test } from 'vitest'

import { createLocalRoomRepository } from '@/repositories/roomRepository'
import AppRoutes from '@/AppRoutes'

beforeEach(() => {
  localStorage.clear()
})

test('structured room can restart and clears all discussion posts', async () => {
  const roomRepo = createLocalRoomRepository(localStorage, { seedDemo: false })
  const room = await roomRepo.createRoom({
    title: 'Structured',
    topic: 'T',
    prompt: 'P',
    mode: 'structured',
    aiGuardEnabled: true,
    capacity: 5,
    participants: 0,
  })

  render(
    <MemoryRouter initialEntries={[`/room/${room.id}`]}>
      <AppRoutes />
    </MemoryRouter>,
  )

  await screen.findByRole('heading', { name: /claim your seat/i })
  await userEvent.type(screen.getByRole('textbox', { name: /your name/i }), 'Alice')
  await userEvent.click(screen.getByRole('button', { name: /claim seat/i }))

  await userEvent.type(screen.getByRole('textbox', { name: /share your thoughts/i }), 'hello')
  await userEvent.click(screen.getByRole('button', { name: /send/i }))
  expect((await screen.findAllByText(/^hello$/i)).length).toBeGreaterThan(0)

  await userEvent.click(screen.getByRole('button', { name: /restart/i }))
  expect(await screen.findByText(/no messages yet/i)).toBeInTheDocument()
})
