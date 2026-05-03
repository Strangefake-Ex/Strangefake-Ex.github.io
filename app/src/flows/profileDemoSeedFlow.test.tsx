import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test } from 'vitest'

import AppRoutes from '@/AppRoutes'

beforeEach(() => {
  localStorage.clear()
})

test('profile seeds demo activity when storage is empty', async () => {
  render(
    <MemoryRouter initialEntries={['/profile']}>
      <AppRoutes />
    </MemoryRouter>,
  )

  expect(await screen.findByRole('heading', { name: /your knight's chronicle/i })).toBeInTheDocument()
  expect(await screen.findByText(/recent chambers/i)).toBeInTheDocument()
  expect(await screen.findByText(/the council of ideas/i)).toBeInTheDocument()
})

