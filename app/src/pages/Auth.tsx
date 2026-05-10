import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, Menu, Shield, UserPlus } from 'lucide-react'

import CrestSeal from '@/components/CrestSeal'
import OrnateDivider from '@/components/OrnateDivider'
import RoundTableLogo from '@/components/RoundTableLogo'
import AppNavDrawer from '@/components/AppNavDrawer'
import { createLocalAuthRepository } from '@/repositories/authRepository'

type Mode = 'signIn' | 'register'

export default function Auth() {
  const navigate = useNavigate()
  const repo = useMemo(() => createLocalAuthRepository(), [])
  const [drawerOpen, setDrawerOpen] = useState(false)

  const [mode, setMode] = useState<Mode>('signIn')
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sessionNickname, setSessionNickname] = useState<string | null>(null)

  useEffect(() => {
    repo.getSession().then((s) => setSessionNickname(s?.nickname ?? null))
  }, [repo])

  return (
    <main className="relative z-10 min-h-dvh bg-transparent font-body text-[#1c1917] rt-page">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-6 focus:top-6 focus:z-50 focus:rounded-xl focus:bg-[#d7b25a] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-black"
        href="#main"
      >
        Skip to content
      </a>
      <div className="mx-auto max-w-6xl px-6 py-10" id="main">
        <div className="flex items-center justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#d7b25a] text-black shadow-[0_18px_44px_rgba(215,178,90,0.22)]">
            <Shield className="h-5 w-5" />
          </div>
          <button
            aria-label="Menu"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#b9902e]/25 bg-white/40 text-[#1c1917] transition hover:bg-white/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/40"
            type="button"
            onClick={() => setDrawerOpen((v) => !v)}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-12 rt-fade-up">
          <div className="relative overflow-hidden rounded-[36px] border border-[#b9902e]/18 bg-white/40 p-8 shadow-[0_30px_90px_rgba(20,17,15,0.10)] backdrop-blur-[2px] lg:col-span-6">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -left-40 -top-56 h-[640px] w-[640px] rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(185,144,46,0.22)_0%,rgba(246,237,215,0)_64%)]" />
              <div className="absolute -bottom-56 -right-56 h-[680px] w-[680px] rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(78,63,159,0.11)_0%,rgba(246,237,215,0)_64%)]" />
              <CrestSeal className="absolute -right-14 -top-10 h-72 w-72 opacity-[0.52] blur-[0.3px] rt-rotate-slow" />
              <RoundTableLogo className="absolute -left-16 -bottom-14 h-72 w-72 opacity-[0.14]" ariaLabel="The Round Table" />
            </div>

            <div className="relative">
              <div className="flex flex-wrap items-center gap-4">
                <RoundTableLogo
                  className="h-12 w-12 drop-shadow-[0_18px_44px_rgba(20,17,15,0.14)]"
                  ariaLabel="The Round Table"
                  tone="bold"
                />
                <div>
                  <h1 className="font-display text-balance text-5xl font-semibold tracking-[-0.03em] text-[#1c1917] sm:text-6xl">
                    The Round Table
                  </h1>
                  <div className="mt-2 text-xs font-semibold tracking-[0.18em] text-[#6b645c]">
                    {mode === 'signIn' ? 'SIGN IN' : 'REGISTER'}
                  </div>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-[#b9902e]/25 bg-white/55 px-4 py-2 text-xs tracking-[0.18em] text-[#7a5b10]">
                {mode === 'signIn' ? <KeyRound className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                {mode === 'signIn' ? 'ENTER THE HALL' : 'FORGE YOUR SIGNET'}
              </div>

              <div className="mt-6 max-w-xl text-pretty text-sm leading-7 text-[#4b463f]">
                Use a nickname and password. Accounts stay on this device only.
              </div>

              <OrnateDivider className="mt-7 h-8 w-full opacity-70" />

              <div className="mt-4 grid gap-3 text-sm text-[#1c1917]">
                <div className="rounded-2xl border border-[#b9902e]/14 bg-white/55 px-4 py-3">
                  <div className="text-xs font-semibold tracking-[0.14em] text-[#7a5b10]">LOCAL-ONLY</div>
                  <div className="mt-1 text-sm text-[#4b463f]">No database, no email, no external sign-in. Just this device.</div>
                </div>
                <div className="rounded-2xl border border-[#b9902e]/14 bg-white/55 px-4 py-3">
                  <div className="text-xs font-semibold tracking-[0.14em] text-[#7a5b10]">FACILITATOR READY</div>
                  <div className="mt-1 text-sm text-[#4b463f]">Switch chambers, set fairness rules, and intervene instantly.</div>
                </div>
              </div>

              {sessionNickname ? (
                <div className="mt-6 rounded-2xl border border-[#b9902e]/18 bg-white/55 px-4 py-3 text-sm text-[#1c1917]">
                  Signed in as <span className="font-semibold">{sessionNickname}</span>.
                </div>
              ) : null}
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="rt-surface rt-gild rounded-[36px] p-7 shadow-[0_20px_70px_rgba(20,17,15,0.10)]">
              <div className="flex items-center gap-2 rounded-2xl border border-[#b9902e]/18 bg-white/55 p-1">
                <button
                  className={[
                    'flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35',
                    mode === 'signIn' ? 'bg-[#b9902e] text-black' : 'text-[#1c1917] hover:bg-white/60',
                  ].join(' ')}
                  type="button"
                  onClick={() => {
                    setMode('signIn')
                    setError(null)
                  }}
                >
                  Sign In
                </button>
                <button
                  className={[
                    'flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35',
                    mode === 'register' ? 'bg-[#b9902e] text-black' : 'text-[#1c1917] hover:bg-white/60',
                  ].join(' ')}
                  type="button"
                  onClick={() => {
                    setMode('register')
                    setError(null)
                  }}
                >
                  Register
                </button>
              </div>

              <div className="mt-6 grid gap-4">
                <div className="rounded-2xl border border-[#b9902e]/18 bg-white/55 px-4 py-3">
                  <label className="text-xs font-semibold tracking-[0.14em] text-[#7a5b10]" htmlFor="nickname">
                    Nickname
                  </label>
                  <input
                    className="mt-2 h-11 w-full rounded-xl border border-[#b9902e]/18 bg-white/70 px-3 text-sm text-[#1c1917] placeholder:text-[#6b645c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35"
                    id="nickname"
                    autoComplete="off"
                    name="nickname"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="e.g. Silver Scholar…"
                  />
                </div>

                <div className="rounded-2xl border border-[#b9902e]/18 bg-white/55 px-4 py-3">
                  <label className="text-xs font-semibold tracking-[0.14em] text-[#7a5b10]" htmlFor="password">
                    Password
                  </label>
                  <input
                    className="mt-2 h-11 w-full rounded-xl border border-[#b9902e]/18 bg-white/70 px-3 text-sm text-[#1c1917] placeholder:text-[#6b645c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35"
                    id="password"
                    type="password"
                    autoComplete="off"
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="choose any passphrase…"
                  />
                </div>

                {error ? <div className="rounded-2xl border border-red-500/24 bg-red-500/10 px-4 py-3 text-sm text-red-900">{error}</div> : null}

                <button
                  className="rt-gild inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#b9902e] px-5 text-sm font-semibold text-black transition hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35 disabled:opacity-50"
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true)
                    setError(null)
                    try {
                      const res =
                        mode === 'register'
                          ? await repo.register({ nickname, password })
                          : await repo.login({ nickname, password })
                      setSessionNickname(res.nickname)
                      navigate('/', { replace: true })
                    } catch (e) {
                      const msg = e instanceof Error ? e.message : 'Auth failed'
                      setError(msg)
                    } finally {
                      setBusy(false)
                    }
                  }}
                >
                  {mode === 'register' ? 'Create Account' : 'Sign In'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AppNavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </main>
  )
}
