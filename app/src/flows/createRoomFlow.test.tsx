import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test } from 'vitest'

import AppRoutes from '@/AppRoutes'

beforeEach(() => {
  localStorage.clear()
})

test('can create a room from lobby and enter the room', async () => {
  render(
    <MemoryRouter initialEntries={['/lobby?create=1']}>
      <AppRoutes />
    </MemoryRouter>,
  )

  await userEvent.type(screen.getByLabelText(/room title/i), 'Week 6 Seminar')
  await userEvent.type(screen.getByLabelText(/prompt/i), 'What makes a classroom psychologically safe?')

  await userEvent.click(screen.getByRole('button', { name: /create room/i }))

  expect(await screen.findByRole('heading', { name: /week 6 seminar/i })).toBeInTheDocument()
  const matches = screen.getAllByText(/what makes a classroom psychologically safe\?/i)
  expect(matches.length).toBeGreaterThan(0)
})
