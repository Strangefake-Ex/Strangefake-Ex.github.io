import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test } from 'vitest'

import AppRoutes from '@/AppRoutes'
import { createLocalRoomRepository } from '@/repositories/roomRepository'

beforeEach(() => {
  localStorage.clear()
})

test('can post a message in a room and like it', async () => {
  const roomRepo = createLocalRoomRepository()
  const room = await roomRepo.createRoom({
    title: 'Demo',
    topic: 'Topic',
    prompt: 'Prompt',
  })

  render(
    <MemoryRouter initialEntries={[`/room/${room.id}`]}>
      <AppRoutes />
    </MemoryRouter>,
  )

  await screen.findByRole('heading', { name: /claim your seat/i })
  await userEvent.type(screen.getByRole('textbox', { name: /your name/i }), 'Alice')
  await userEvent.click(screen.getByRole('button', { name: /claim seat/i }))

  await userEvent.type(screen.getByRole('textbox', { name: /share your thoughts with the round table/i }), 'Hello Round Table')
  await userEvent.click(screen.getByRole('button', { name: /send/i }))

  const matches = await screen.findAllByText(/hello round table/i)
  expect(matches.length).toBeGreaterThan(0)

  await userEvent.click(screen.getByRole('button', { name: /like/i }))
  expect(screen.getByText('1')).toBeInTheDocument()
})
