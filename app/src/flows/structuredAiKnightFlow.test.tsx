import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test } from 'vitest'

import AppRoutes from '@/AppRoutes'
import { createLocalRoomRepository } from '@/repositories/roomRepository'
import { createLocalSeatRepository } from '@/repositories/seatRepository'
import { createLocalSessionRepository } from '@/repositories/sessionRepository'

beforeEach(() => {
  localStorage.clear()
})

test('structured session posts an AI knight message when it is the bot turn', async () => {
  const roomRepo = createLocalRoomRepository(localStorage, { seedDemo: false })
  const room = await roomRepo.createRoom({
    title: 'Session',
    topic: 'Topic',
    prompt: 'Prompt',
    mode: 'structured',
    capacity: 7,
    participants: 6,
    aiGuardEnabled: true,
    security: 'guarded',
    shieldStrength: 72,
  })

  const seatRepo = createLocalSeatRepository(localStorage)
  const seat = await seatRepo.claimSeat(room.id, { displayName: 'Alice', isAnonymous: false })

  const sessionRepo = createLocalSessionRepository(localStorage)
  const session = await sessionRepo.ensureSession(room.id, seat, { targetParticipants: 6 })
  const bot = session.order.find((p) => p.isBot)!
  await sessionRepo.setCurrentSpeaker(room.id, bot.id)

  render(
    <MemoryRouter initialEntries={[`/room/${room.id}`]}>
      <AppRoutes />
    </MemoryRouter>,
  )

  await screen.findByRole('heading', { name: /session/i })
  expect((await screen.findAllByText(/sir rowan|lady nyx|scholar miro|dame elara|sage kian|sir vale/i)).length).toBeGreaterThan(0)
  expect(screen.queryByText(/building on/i)).toBeNull()
})
