import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, test } from 'vitest'

import AppRoutes from '@/AppRoutes'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
})

test('menu button opens side drawer navigation', async () => {
  localStorage.setItem('rt:auth:session:v1', JSON.stringify({ nickname: 'Alice', createdAt: Date.now() }))
  render(
    <MemoryRouter initialEntries={['/']}>
      <AppRoutes />
    </MemoryRouter>,
  )

  await userEvent.click(screen.getByRole('button', { name: /menu/i }))
  expect(await screen.findByRole('heading', { name: /navigation/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument()
  expect(screen.getAllByRole('link', { name: /create a chamber/i }).length).toBeGreaterThan(0)
  expect(screen.getByRole('link', { name: /facilitator/i })).toBeInTheDocument()
})

test('unauthenticated drawer only shows sign in', async () => {
  render(
    <MemoryRouter initialEntries={['/auth']}>
      <AppRoutes />
    </MemoryRouter>,
  )

  await userEvent.click(await screen.findByRole('button', { name: /menu/i }))
  expect(await screen.findByRole('heading', { name: /navigation/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /home/i })).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /create a chamber/i })).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /facilitator/i })).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /profile/i })).not.toBeInTheDocument()
})
