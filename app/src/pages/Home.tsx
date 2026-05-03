import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Crown, Filter, Menu, Shield, Sparkles, Users } from 'lucide-react'

import {
  createLocalRoomRepository,
  type DiscussionMode,
  type Room,
  type SecurityLevel,
} from '@/repositories/roomRepository'
import AppNavDrawer from '@/components/AppNavDrawer'
import CrestSeal from '@/components/CrestSeal'
import OrnateDivider from '@/components/OrnateDivider'

type ModeFilter = 'all' | DiscussionMode
type SecurityFilter = 'all' | SecurityLevel

export default function Home() {
  const repo = useMemo(() => createLocalRoomRepository(), [])
  const navigate = useNavigate()
  const [rooms, setRooms] = useState<Room[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)

  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<ModeFilter>('all')
  const [security, setSecurity] = useState<SecurityFilter>('all')
  const [aiOnly, setAiOnly] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [inviteError, setInviteError] = useState<string | null>(null)

  useEffect(() => {
    repo.listRooms().then(setRooms)
  }, [repo])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rooms.filter((r) => {
      if (mode !== 'all' && r.mode !== mode) return false
      if (security !== 'all' && r.security !== security) return false
      if (aiOnly && !r.aiGuardEnabled) return false
      if (!q) return true
      return `${r.title} ${r.topic} ${r.prompt}`.toLowerCase().includes(q)
    })
  }, [aiOnly, mode, query, rooms, security])

  function badgeForSecurity(level: SecurityLevel) {
    if (level === 'fortified') return { label: 'Fortified', className: 'text-emerald-800 border-emerald-700/30 bg-emerald-50/70' }
    if (level === 'guarded') return { label: 'Guarded', className: 'text-amber-900 border-amber-700/28 bg-amber-50/70' }
    return { label: 'Open', className: 'text-[#1c1917] border-[#b9902e]/20 bg-white/55' }
  }

  return (
    <main className="relative z-10 min-h-dvh bg-transparent font-body text-[#1c1917] rt-page">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-6 focus:top-6 focus:z-50 focus:rounded-xl focus:bg-[#d7b25a] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-black"
        href="#main"
      >
        Skip to content
      </a>
      <div className="relative mx-auto flex max-w-5xl flex-col px-6 py-10" id="main">
          <div className="flex items-center justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#d7b25a] text-black shadow-[0_18px_44px_rgba(215,178,90,0.22)]">
            <Shield className="h-5 w-5" />
          </div>
          <button
            aria-label="Menu"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#b9902e]/25 bg-white/40 text-[#1c1917] transition hover:bg-white/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/40"
            type="button"
            onClick={() => setDrawerOpen((v) => !v)}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-14 grid items-center gap-10 lg:grid-cols-12 rt-fade-up">
          <div className="relative lg:col-span-7">
            <CrestSeal className="pointer-events-none absolute -left-10 -top-10 h-56 w-56 opacity-55 blur-[0.2px] sm:h-72 sm:w-72 rt-rotate-slow" />
            <div className="inline-flex items-center gap-2 rounded-full border border-[#b9902e]/25 bg-white/50 px-4 py-2 text-xs tracking-[0.18em] text-[#7a5b10]">
              <Sparkles className="h-3.5 w-3.5" />
              THE SANCTUARY OF VOICES
            </div>

            <h1 className="mt-6 font-display text-balance text-5xl font-semibold tracking-[-0.03em] text-[#1c1917] sm:text-6xl">
              The Round Table
            </h1>
            <p className="mt-4 max-w-xl text-pretty text-sm leading-7 text-[#3f3a34]">
              A candlelit hall for seminar dialogue — where drafts stay private, courage is cultivated, and every knight may speak with honor.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                className="rt-gild inline-flex items-center justify-center gap-2 rounded-2xl bg-[#d7b25a] px-6 py-4 text-sm font-semibold text-black shadow-[0_22px_60px_rgba(215,178,90,0.26)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7b25a]/50"
                href="#join"
              >
                Enter the Hall
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                className="rt-gild inline-flex items-center justify-center gap-2 rounded-2xl border border-[#b9902e]/25 bg-white/50 px-6 py-4 text-sm font-semibold text-[#1c1917] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/40"
                to="/create"
              >
                Forge a Chamber
              </Link>
            </div>

            <form
              className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center"
              onSubmit={async (e) => {
                e.preventDefault()
                const code = inviteCode.trim()
                if (!code) return
                const room = await repo.findRoomByFacilitatorCode(code)
                if (!room) {
                  setInviteError('Invalid invite code.')
                  return
                }
                setInviteError(null)
                navigate(`/room/${room.id}`)
              }}
            >
              <div className="flex flex-1 items-center gap-3 rounded-2xl border border-[#b9902e]/20 bg-white/60 px-4 py-3">
                <input
                  aria-label="Invite code"
                  autoComplete="off"
                  className="h-8 w-full bg-transparent text-sm text-[#1c1917] placeholder:text-[#6b645c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35"
                  name="inviteCode"
                  placeholder="Invite code…"
                  spellCheck={false}
                  value={inviteCode}
                  onChange={(e) => {
                    setInviteCode(e.target.value)
                    if (inviteError) setInviteError(null)
                  }}
                />
              </div>
              <button
                className="rt-gild inline-flex h-[52px] items-center justify-center rounded-2xl bg-[#b9902e] px-6 text-sm font-semibold text-black transition hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/40 disabled:opacity-50"
                type="submit"
                disabled={!inviteCode.trim()}
              >
                Join by code
              </button>
              {inviteError ? <div className="text-sm font-semibold text-red-700">{inviteError}</div> : null}
            </form>
          </div>

          <div className="lg:col-span-5">
            <div className="rt-surface rt-gild rounded-3xl p-6">
              <div className="text-xs font-semibold tracking-[0.18em] text-[#7a5b10]">OATH OF THE ROUND</div>
              <div className="mt-4 grid gap-3 text-sm leading-7 text-[#3f3a34]">
                <div className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#d7b25a]" />
                  <span>Private drafts before public speech.</span>
                </div>
                <div className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#d7b25a]" />
                  <span>Round-robin order when the hall grows loud.</span>
                </div>
                <div className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#d7b25a]" />
                  <span>Facilitator helm for fairness & clarity.</span>
                </div>
              </div>
              <div className="mt-6 rounded-2xl border border-[#b9902e]/20 bg-white/55 px-4 py-3 text-xs text-[#3f3a34]">
                Tip: Start in Thought Space — then polish & publish when you’re ready.
              </div>
            </div>
          </div>
        </div>

        <OrnateDivider className="mt-10 h-8 w-full opacity-80 rt-fade-up" />

        <section className="mt-16 scroll-mt-6 rt-fade-up" id="join">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Join the Discussion</h2>
              <div className="mt-2 text-sm text-[#4b463f]">Find a chamber, claim a seat, and speak without fear.</div>
            </div>
          </div>

          <div className="mt-6 rt-surface rt-gild rounded-2xl p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 items-center gap-3 rounded-xl border border-[#b9902e]/20 bg-white/70 px-3 py-2">
                <Filter className="h-4 w-4 text-[#6b645c]" />
                <input
                  aria-label="Search chambers by name or topic…"
                  autoComplete="off"
                  className="h-8 w-full bg-transparent text-sm text-[#1c1917] placeholder:text-[#6b645c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35 focus-visible:ring-offset-0"
                  name="q"
                  placeholder="Search chambers by name or topic…"
                  spellCheck={false}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="mr-1 text-xs text-[#4b463f]">Filters:</div>
                <button
                  className={[
                    'h-9 rounded-xl px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35',
                    mode === 'all' ? 'bg-[#b9902e] text-black' : 'border border-[#b9902e]/20 bg-white/60 text-[#1c1917] hover:bg-white/75',
                  ].join(' ')}
                  type="button"
                  onClick={() => setMode('all')}
                >
                  All Modes
                </button>
                <button
                  className={[
                    'h-9 rounded-xl px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35',
                    mode === 'structured' ? 'bg-[#b9902e] text-black' : 'border border-[#b9902e]/20 bg-white/60 text-[#1c1917] hover:bg-white/75',
                  ].join(' ')}
                  type="button"
                  onClick={() => setMode('structured')}
                >
                  Structured
                </button>
                <button
                  className={[
                    'h-9 rounded-xl px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35',
                    mode === 'freeForm' ? 'bg-[#b9902e] text-black' : 'border border-[#b9902e]/20 bg-white/60 text-[#1c1917] hover:bg-white/75',
                  ].join(' ')}
                  type="button"
                  onClick={() => setMode('freeForm')}
                >
                  Free Form
                </button>

                <select
                  aria-label="Security"
                  className="h-9 rounded-xl border border-[#b9902e]/20 bg-white/70 px-3 text-xs font-semibold text-[#1c1917] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35"
                  name="security"
                  value={security}
                  onChange={(e) => setSecurity(e.target.value as SecurityFilter)}
                >
                  <option value="all">All Security</option>
                  <option value="fortified">Fortified</option>
                  <option value="guarded">Guarded</option>
                  <option value="open">Open</option>
                </select>

                <button
                  className={[
                    'h-9 rounded-xl px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40',
                    aiOnly ? 'bg-violet-600/90 text-white' : 'border border-[#b9902e]/20 bg-white/60 text-[#1c1917] hover:bg-white/75',
                  ].join(' ')}
                  type="button"
                  onClick={() => setAiOnly((v) => !v)}
                >
                  AI Guard Only
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 text-sm text-[#4b463f]">
            Showing <span className="font-semibold text-[#1c1917]">{filtered.length}</span> chambers
          </div>

          <div className="mt-4 grid gap-4">
            {filtered.map((r) => {
              const sec = badgeForSecurity(r.security)
              return (
                <div key={r.id} className="rt-surface rt-gild rounded-3xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl bg-black/20 text-[#f0d38a]">
                        <Crown className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-lg font-semibold tracking-tight text-[#1c1917]">{r.title}</div>
                        <div className="mt-1 text-sm text-[#4b463f]">{r.topic}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={['inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold', sec.className].join(' ')}>
                        <Shield className="h-3.5 w-3.5" />
                        {sec.label}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center gap-2 text-sm text-[#4b463f]">
                      <Users className="h-4 w-4 text-[#6b645c]" />
                      <span className="font-semibold text-[#1c1917]">
                        {r.participants}/{r.capacity}
                      </span>
                      <span className="text-xs text-[#6b645c]">knights</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-lg bg-white/60 px-2 py-1 text-[10px] font-semibold tracking-[0.14em] text-[#4b463f]">
                        {r.mode === 'structured' ? 'STRUCTURED' : 'FREE FORM'}
                      </span>
                      {r.aiGuardEnabled ? (
                        <span className="rounded-lg bg-violet-700/20 px-2 py-1 text-[10px] font-semibold tracking-[0.14em] text-violet-200">
                          AI GUARD
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-4">
                    <div className="line-clamp-2 text-sm leading-7 text-[#3f3a34]">{r.prompt}</div>
                    <Link
                      className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-[#d7b25a] px-4 text-sm font-semibold text-black transition hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7b25a]/50"
                      to={`/room/${r.id}`}
                    >
                      Claim Your Seat
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>
      <AppNavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </main>
  )
}
