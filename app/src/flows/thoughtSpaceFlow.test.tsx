import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test } from 'vitest'

import AppRoutes from '@/AppRoutes'

beforeEach(() => {
  localStorage.clear()
})

test('room provides a thought space draft that can be published', async () => {
  render(
    <MemoryRouter initialEntries={['/room/1']}>
      <AppRoutes />
    </MemoryRouter>,
  )

  await screen.findByRole('heading', { name: /claim your seat/i })
  await userEvent.type(screen.getByRole('textbox', { name: /your name/i }), 'Alice')
  await userEvent.click(screen.getByRole('button', { name: /claim seat/i }))

  expect(await screen.findByRole('heading', { name: /thought space/i })).toBeInTheDocument()

  const draft = screen.getByRole('textbox', { name: /private draft/i })
  await userEvent.type(draft, 'My draft idea')
  await userEvent.click(screen.getByRole('button', { name: /publish from draft/i }))
  const dialog = await screen.findByRole('dialog', { name: /confirm publish/i })
  await userEvent.click(within(dialog).getByRole('button', { name: /^publish$/i }))
  expect((draft as HTMLTextAreaElement).value).toBe('')

  const posts = await screen.findAllByText(/my draft idea/i)
  expect(posts.length).toBeGreaterThan(0)
})
