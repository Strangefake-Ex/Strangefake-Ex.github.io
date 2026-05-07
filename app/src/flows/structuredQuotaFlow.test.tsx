import { render, screen, within } from '@testing-library/react'
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

  const publish = screen.getByRole('button', { name: /publish from draft/i })
  const advance = screen.getByRole('button', { name: /advance turn/i })
  const draft = screen.getByRole('textbox', { name: /private draft/i })

  async function confirmAdvance() {
    await userEvent.click(advance)
    const dialog = await screen.findByRole('dialog', { name: /confirm advance turn/i })
    await userEvent.click(within(dialog).getByRole('button', { name: /^advance$/i }))
  }

  async function confirmPublish() {
    await userEvent.click(publish)
    const dialog = await screen.findByRole('dialog', { name: /confirm publish/i })
    await userEvent.click(within(dialog).getByRole('button', { name: /^publish$/i }))
  }

  for (let i = 0; i < 3; i++) {
    await userEvent.type(draft, `msg-${i}`)
    for (let j = 0; j < 20 && publish.disabled; j++) {
      await confirmAdvance()
    }
    expect(publish).toBeEnabled()
    await confirmPublish()
  }

  expect(await screen.findByText(/quota reached/i)).toBeInTheDocument()
  await userEvent.type(draft, 'one more')
  expect(publish).toBeDisabled()
})
