import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test } from 'vitest'

import AppRoutes from '@/AppRoutes'

beforeEach(() => {
  localStorage.clear()
})

test('room requires claiming a seat before sending messages', async () => {
  render(
    <MemoryRouter initialEntries={['/room/1']}>
      <AppRoutes />
    </MemoryRouter>,
  )

  expect(await screen.findByRole('heading', { name: /claim your seat/i })).toBeInTheDocument()

  await userEvent.type(screen.getByRole('textbox', { name: /your name/i }), 'Alice')
  await userEvent.click(screen.getByRole('button', { name: /claim seat/i }))

  expect(screen.queryByRole('heading', { name: /claim your seat/i })).not.toBeInTheDocument()

  const publish = screen.getByRole('button', { name: /publish from draft/i })
  expect(publish).toBeDisabled()
  await userEvent.type(screen.getByRole('textbox', { name: /private draft/i }), 'Hello')
  expect(publish).toBeEnabled()
})
