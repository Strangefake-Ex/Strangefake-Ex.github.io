import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test } from 'vitest'

import AppRoutes from '@/AppRoutes'

beforeEach(() => {
  localStorage.clear()
})

test('root shows auth when no session', async () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <AppRoutes />
    </MemoryRouter>,
  )

  expect((await screen.findAllByRole('heading', { name: /^the round table$/i })).length).toBeGreaterThan(0)
  expect(screen.getByRole('textbox', { name: /nickname/i })).toBeInTheDocument()
})

test('root shows home when session exists', async () => {
  localStorage.setItem('rt:auth:session:v1', JSON.stringify({ nickname: 'Alice', createdAt: Date.now() }))

  render(
    <MemoryRouter initialEntries={['/']}>
      <AppRoutes />
    </MemoryRouter>,
  )

  expect(await screen.findByRole('heading', { name: /join the discussion/i })).toBeInTheDocument()
})
