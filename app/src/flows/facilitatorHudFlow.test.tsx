import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test } from 'vitest'

import { createLocalRoomRepository } from '@/repositories/roomRepository'
import AppRoutes from '@/AppRoutes'

beforeEach(() => {
  localStorage.clear()
})

test('facilitator shows near contributions from thought space drafts', async () => {
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

  await userEvent.type(screen.getByRole('textbox', { name: /private draft/i }), 'A near contribution that is not posted')

  render(
    <MemoryRouter initialEntries={[`/facilitator/${room.id}`]}>
      <AppRoutes />
    </MemoryRouter>,
  )

  expect(await screen.findByText(/near contributions/i)).toBeInTheDocument()
  expect(screen.getByText(/near contribution that is not posted/i)).toBeInTheDocument()
})

