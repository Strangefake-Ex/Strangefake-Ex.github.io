import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test } from 'vitest'

import AppRoutes from '@/AppRoutes'

beforeEach(() => {
  localStorage.clear()
})

test('can register, sign out, and sign in with nickname + password', async () => {
  render(
    <MemoryRouter initialEntries={['/auth']}>
      <AppRoutes />
    </MemoryRouter>,
  )

  await userEvent.click(screen.getByRole('button', { name: /^register$/i }))
  await userEvent.type(screen.getByRole('textbox', { name: /nickname/i }), 'Alice')
  await userEvent.type(screen.getByLabelText(/password/i), 'pw123')
  await userEvent.click(screen.getByRole('button', { name: /create account/i }))

  expect(await screen.findByRole('heading', { name: /join the discussion/i })).toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: /menu/i }))
  expect(await screen.findByText(/signed in as/i)).toBeInTheDocument()
  expect(screen.getByText(/alice/i)).toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: /sign out/i }))

  await userEvent.click(screen.getByRole('button', { name: /menu/i }))
  expect(await screen.findByRole('link', { name: /sign in/i })).toBeInTheDocument()

  await userEvent.click(screen.getByRole('link', { name: /sign in/i }))
  await userEvent.type(screen.getByRole('textbox', { name: /nickname/i }), 'Alice')
  await userEvent.type(screen.getByLabelText(/password/i), 'pw123')
  const signInButtons = screen.getAllByRole('button', { name: /^sign in$/i })
  await userEvent.click(signInButtons[signInButtons.length - 1]!)

  expect(await screen.findByRole('heading', { name: /join the discussion/i })).toBeInTheDocument()
})
