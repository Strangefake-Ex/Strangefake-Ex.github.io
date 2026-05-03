import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test } from 'vitest'

import AppRoutes from '@/AppRoutes'

beforeEach(() => {
  localStorage.clear()
})

test('room shows AI Guardian panel and key points tabs', async () => {
  render(
    <MemoryRouter initialEntries={['/room/1']}>
      <AppRoutes />
    </MemoryRouter>,
  )

  expect(await screen.findByRole('heading', { name: /the council of ideas/i })).toBeInTheDocument()
  expect(screen.getByText(/ai guardian/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /refresh analysis/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /key points/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /keywords/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /notable citations/i })).toBeInTheDocument()
})

