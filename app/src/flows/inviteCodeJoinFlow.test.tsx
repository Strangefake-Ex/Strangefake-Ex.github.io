import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test } from 'vitest'

import AppRoutes from '@/AppRoutes'
import { createLocalRoomRepository } from '@/repositories/roomRepository'

beforeEach(() => {
  localStorage.clear()
})

test('home can join a room by invite code', async () => {
  localStorage.setItem('rt:auth:session:v1', JSON.stringify({ nickname: 'Alice', createdAt: Date.now() }))

  const repo = createLocalRoomRepository(localStorage, { seedDemo: false })
  await repo.createRoom({
    title: 'Session',
    topic: 'Topic',
    prompt: 'Prompt',
    capacity: 7,
    participants: 0,
    facilitatorCode: 'ABC123',
  })

  render(
    <MemoryRouter initialEntries={['/']}>
      <AppRoutes />
    </MemoryRouter>,
  )

  await screen.findByRole('heading', { name: /join the discussion/i })
  await userEvent.type(screen.getByRole('textbox', { name: /invite code/i }), 'abc123')
  await userEvent.click(screen.getByRole('button', { name: /join by code/i }))

  expect(await screen.findByRole('heading', { name: /session/i })).toBeInTheDocument()
  expect(await screen.findByRole('heading', { name: /claim your seat/i })).toBeInTheDocument()
})
