import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test } from 'vitest'

import AppRoutes from '@/AppRoutes'

beforeEach(() => {
  localStorage.clear()
})

test('create page requires name and topic then creates a chamber', async () => {
  render(
    <MemoryRouter initialEntries={['/create']}>
      <AppRoutes />
    </MemoryRouter>,
  )

  expect(screen.getByRole('heading', { name: /forge a new chamber/i })).toBeInTheDocument()

  const establish = screen.getByRole('button', { name: /establish round table/i })
  expect(establish).toBeDisabled()

  await userEvent.type(screen.getByRole('textbox', { name: /enter your round table's name/i }), 'Demo Chamber')
  await userEvent.type(screen.getByRole('textbox', { name: /what shall we deliberate upon/i }), 'Demo topic')

  expect(establish).toBeEnabled()
  await userEvent.click(establish)

  expect(await screen.findByRole('heading', { name: /demo chamber/i })).toBeInTheDocument()
})
