import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test } from 'vitest'

import { createLocalRoomRepository } from '@/repositories/roomRepository'
import AppRoutes from '@/AppRoutes'

beforeEach(() => {
  localStorage.clear()
})

test('structured room disables sending when it is not your turn', async () => {
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

  expect(await screen.findByText(/structured order/i)).toBeInTheDocument()

  await userEvent.type(screen.getByRole('textbox', { name: /share your thoughts/i }), 'Hi')
  expect(screen.getByRole('button', { name: /send/i })).toBeEnabled()

  await userEvent.click(screen.getByRole('button', { name: /advance turn/i }))
  const dialog = await screen.findByRole('dialog', { name: /confirm advance turn/i })
  await userEvent.click(within(dialog).getByRole('button', { name: /^advance$/i }))
  expect(screen.getByRole('button', { name: /send/i })).toBeDisabled()
})
