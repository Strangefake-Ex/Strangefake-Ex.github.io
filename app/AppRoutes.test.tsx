import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, test } from 'vitest'

import AppRoutes from './AppRoutes'

test('home renders hero and exposes join discussion section', async () => {
  localStorage.clear()
  localStorage.setItem('rt:auth:session:v1', JSON.stringify({ nickname: 'Alice', createdAt: Date.now() }))
  render(
    <MemoryRouter initialEntries={['/']}>
      <AppRoutes />
    </MemoryRouter>,
  )

  expect(screen.getByRole('heading', { name: /the round table/i })).toBeInTheDocument()

  await userEvent.click(screen.getByRole('link', { name: /enter the hall/i }))
  expect(await screen.findByRole('heading', { name: /join the discussion/i })).toBeInTheDocument()
})
