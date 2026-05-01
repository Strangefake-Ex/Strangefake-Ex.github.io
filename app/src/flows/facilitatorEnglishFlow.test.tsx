import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test } from 'vitest'

import AppRoutes from '@/AppRoutes'

beforeEach(() => {
  localStorage.clear()
})

test('facilitator UI is English', async () => {
  render(
    <MemoryRouter initialEntries={['/facilitator/1']}>
      <AppRoutes />
    </MemoryRouter>,
  )

  expect(await screen.findByRole('heading', { name: /facilitator/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /export summary/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /back to room/i })).toBeInTheDocument()
})

