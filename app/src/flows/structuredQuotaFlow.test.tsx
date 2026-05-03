import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test } from 'vitest'

import { createLocalRoomRepository } from '@/repositories/roomRepository'
import AppRoutes from '@/AppRoutes'

beforeEach(() => {
  localStorage.clear()
})

test('structured room enforces max speeches quota', async () => {
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

  const send = screen.getByRole('button', { name: /send/i })
  const advance = screen.getByRole('button', { name: /advance turn/i })
  const input = screen.getByRole('textbox', { name: /share your thoughts/i })

  for (let i = 0; i < 3; i++) {
    await userEvent.type(input, `msg-${i}`)
    await userEvent.click(send)
    await userEvent.click(advance)
    await userEvent.click(advance)
  }

  await userEvent.click(advance)
  await userEvent.click(advance)
  expect(send).toBeDisabled()
  expect(screen.getAllByText(/quota/i).length).toBeGreaterThan(0)
})
