import { expect, test, vi } from 'vitest'

import { removeKey, setJson, subscribeKey } from './localStore'

test('subscribeKey receives updates when setJson/removeKey are called in same tab', () => {
  localStorage.clear()
  const seen: Array<{ value: unknown | null }> = []
  const unsub = subscribeKey('k1', (value) => {
    seen.push({ value })
  })

  setJson('k1', { a: 1 })
  removeKey('k1')
  unsub()
  setJson('k1', { a: 2 })

  expect(seen).toEqual([{ value: { a: 1 } }, { value: null }])
})

test('subscribeKey unsubscribe stops notifications', () => {
  localStorage.clear()
  const fn = vi.fn()
  const unsub = subscribeKey('k1', fn)
  unsub()
  setJson('k1', { a: 1 })
  expect(fn).not.toHaveBeenCalled()
})

