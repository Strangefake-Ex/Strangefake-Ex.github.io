import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test } from 'vitest'

import AppRoutes from '@/AppRoutes'

beforeEach(() => {
  localStorage.clear()
})

test('home shows join discussion filters and demo chambers', async () => {
  localStorage.setItem('rt:auth:session:v1', JSON.stringify({ nickname: 'Alice', createdAt: Date.now() }))
  render(
    <MemoryRouter initialEntries={['/']}>
      <AppRoutes />
    </MemoryRouter>,
  )

  expect(screen.getByRole('heading', { name: /join the discussion/i })).toBeInTheDocument()
  expect(screen.getByRole('textbox', { name: /search chambers by name or topic/i })).toBeInTheDocument()

  expect(screen.getByText(/showing/i)).toBeInTheDocument()
  expect(await screen.findByText(/the council of ideas/i)).toBeInTheDocument()
})
