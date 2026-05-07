import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test } from 'vitest'

import AppRoutes from '@/AppRoutes'

beforeEach(() => {
  localStorage.clear()
})

test('thought space can apply AI rewrite back into the private draft', async () => {
  render(
    <MemoryRouter initialEntries={['/room/1']}>
      <AppRoutes />
    </MemoryRouter>,
  )

  await screen.findByRole('heading', { name: /claim your seat/i })
  await userEvent.type(screen.getByRole('textbox', { name: /your name/i }), 'Alice')
  await userEvent.click(screen.getByRole('button', { name: /claim seat/i }))

  const draft = screen.getByRole('textbox', { name: /private draft/i })
  await userEvent.type(draft, 'I think this is good')
  await userEvent.click(screen.getByRole('button', { name: /polish with ai/i }))

  await screen.findByText(/ai suggestion/i)
  await userEvent.click(await screen.findByRole('button', { name: /use rewrite/i }))

  expect((draft as HTMLTextAreaElement).value.toLowerCase()).not.toContain('in response to the prompt')
  expect((draft as HTMLTextAreaElement).value.trim()).not.toBe('I think this is good')
})
