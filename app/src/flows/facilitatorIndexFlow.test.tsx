import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test } from 'vitest'

import { createLocalRoomRepository } from '@/repositories/roomRepository'
import AppRoutes from '@/AppRoutes'

beforeEach(() => {
  localStorage.clear()
})

test('facilitator index redirects to first chamber facilitator view', async () => {
  const roomRepo = createLocalRoomRepository(localStorage, { seedDemo: false })
  await roomRepo.createRoom({
    title: 'Session',
    topic: 'Topic',
    prompt: 'Prompt',
    aiGuardEnabled: true,
    capacity: 7,
    participants: 1,
  })

  render(
    <MemoryRouter initialEntries={['/facilitator']}>
      <AppRoutes />
    </MemoryRouter>,
  )

  expect(await screen.findByText(/facilitator's helm/i)).toBeInTheDocument()
})

