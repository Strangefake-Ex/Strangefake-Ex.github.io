type Listener = (value: unknown | null) => void

const listeners = new Map<string, Set<Listener>>()
let storageHooked = false

function safeParse(value: string | null) {
  if (!value) return null
  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

function notify(key: string, value: unknown | null) {
  const set = listeners.get(key)
  if (!set) return
  for (const fn of set) fn(value)
}

function ensureStorageHook() {
  if (storageHooked) return
  storageHooked = true
  window.addEventListener('storage', (e) => {
    if (!e.key) return
    notify(e.key, safeParse(e.newValue))
  })
}

export function getJson<T = unknown>(key: string): T | null {
  return safeParse(localStorage.getItem(key)) as T | null
}

export function setJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
  notify(key, value)
}

export function removeKey(key: string) {
  localStorage.removeItem(key)
  notify(key, null)
}

export function subscribeKey(key: string, fn: Listener) {
  ensureStorageHook()
  const existing = listeners.get(key) ?? new Set<Listener>()
  existing.add(fn)
  listeners.set(key, existing)
  return () => {
    const set = listeners.get(key)
    if (!set) return
    set.delete(fn)
    if (set.size === 0) listeners.delete(key)
  }
}

