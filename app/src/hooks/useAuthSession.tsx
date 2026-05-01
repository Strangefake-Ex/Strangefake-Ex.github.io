import { useEffect, useState } from 'react'

import type { AuthSession } from '@/repositories/authRepository'
import { getJson, removeKey, subscribeKey } from '@/lib/localStore'
import { AUTH_SESSION_KEY } from '@/lib/storageKeys'

export default function useAuthSession() {
  const [session, setSession] = useState<AuthSession | null>(() => getJson<AuthSession>(AUTH_SESSION_KEY))

  useEffect(() => {
    return subscribeKey(AUTH_SESSION_KEY, (value) => {
      setSession((value ?? null) as AuthSession | null)
    })
  }, [])

  async function signOut() {
    removeKey(AUTH_SESSION_KEY)
  }

  return { session, signOut }
}

