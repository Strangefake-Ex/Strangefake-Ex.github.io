import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test } from 'vitest'

import AppRoutes from '@/AppRoutes'

beforeEach(() => {
  localStorage.clear()
})

test('room highlights extracted keywords in messages when AI guard is enabled', async () => {
  render(
    <MemoryRouter initialEntries={['/room/1']}>
      <AppRoutes />
    </MemoryRouter>,
  )

  await screen.findByRole('heading', { name: /claim your seat/i })
  await userEvent.type(screen.getByRole('textbox', { name: /your name/i }), 'Alice')
  await userEvent.click(screen.getByRole('button', { name: /claim seat/i }))

  await userEvent.type(screen.getByRole('textbox', { name: /share your thoughts/i }), 'safety safety helps participation')
  await userEvent.click(screen.getByRole('button', { name: /send/i }))

  const highlighted = await screen.findAllByText(/safety/i, { selector: 'span[data-guardian-highlight="true"]' })
  expect(highlighted.length).toBeGreaterThan(0)
})

