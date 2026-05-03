import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test } from 'vitest'

import AppRoutes from '@/AppRoutes'
import { createLocalRoomRepository } from '@/repositories/roomRepository'

beforeEach(() => {
  localStorage.clear()
})

test('advance turn requires confirmation', async () => {
  const roomRepo = createLocalRoomRepository(localStorage, { seedDemo: false })
  const room = await roomRepo.createRoom({
    title: 'Structured Room',
    topic: 'T',
    prompt: 'P',
    mode: 'structured',
    aiGuardEnabled: false,
    capacity: 7,
    participants: 1,
  })

  render(
    <MemoryRouter initialEntries={[`/room/${room.id}`]}>
      <AppRoutes />
    </MemoryRouter>,
  )

  await screen.findByRole('heading', { name: /claim your seat/i })
  await userEvent.type(screen.getByRole('textbox', { name: /your name/i }), 'Alice')
  await userEvent.click(screen.getByRole('button', { name: /claim seat/i }))

  await userEvent.click(await screen.findByRole('button', { name: /advance turn/i }))
  const dialog = await screen.findByRole('dialog', { name: /confirm advance turn/i })
  await userEvent.click(within(dialog).getByRole('button', { name: /^advance$/i }))

  expect(await screen.findByText(/turn advanced/i)).toBeInTheDocument()
})

