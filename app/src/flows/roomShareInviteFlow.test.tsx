import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import AppRoutes from '@/AppRoutes'
import { createLocalRoomRepository } from '@/repositories/roomRepository'
import { seatsKey } from '@/lib/storageKeys'

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

afterEach(() => {
  cleanup()
})

test('room provides a single invite-code copy action', async () => {
  const roomRepo = createLocalRoomRepository(localStorage, { seedDemo: false })
  const room = await roomRepo.createRoom({
    title: 'Session',
    topic: 'Topic',
    prompt: 'Prompt',
    aiGuardEnabled: false,
    capacity: 7,
    participants: 0,
    facilitatorCode: 'ABC123',
  })

  localStorage.setItem(
    seatsKey(room.id),
    JSON.stringify({
      id: 'seat-1',
      roomId: room.id,
      displayName: 'Alice',
      isAnonymous: false,
      createdAt: Date.now(),
    }),
  )

  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  })

  render(
    <MemoryRouter initialEntries={[`/room/${room.id}`]}>
      <AppRoutes />
    </MemoryRouter>,
  )

  await screen.findByRole('heading', { name: /session/i })

  expect(screen.queryByRole('button', { name: /copy room link/i })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /copy facilitator link/i })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /share/i })).not.toBeInTheDocument()

  expect(screen.queryByRole('button', { name: /copy invite code/i })).not.toBeInTheDocument()
  expect(screen.getByText(/invite code/i)).toBeInTheDocument()
  expect(screen.getByText(/abc123/i)).toBeInTheDocument()
})

test('copy invite code falls back to prompt when clipboard write fails', async () => {
  const roomRepo = createLocalRoomRepository(localStorage, { seedDemo: false })
  const room = await roomRepo.createRoom({
    title: 'Session',
    topic: 'Topic',
    prompt: 'Prompt',
    aiGuardEnabled: false,
    capacity: 7,
    participants: 0,
    facilitatorCode: 'ABC123',
  })

  localStorage.setItem(
    seatsKey(room.id),
    JSON.stringify({
      id: 'seat-1',
      roomId: room.id,
      displayName: 'Alice',
      isAnonymous: false,
      createdAt: Date.now(),
    }),
  )

  const writeText = vi.fn().mockRejectedValue(new Error('denied'))
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  })
  const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue(null)

  render(
    <MemoryRouter initialEntries={[`/room/${room.id}`]}>
      <AppRoutes />
    </MemoryRouter>,
  )

  await screen.findByRole('heading', { name: /session/i })
  expect(screen.queryByRole('button', { name: /copy invite code/i })).not.toBeInTheDocument()
  expect(screen.getByText(/abc123/i)).toBeInTheDocument()
  expect(writeText).not.toHaveBeenCalled()
  expect(promptSpy).not.toHaveBeenCalled()
})
