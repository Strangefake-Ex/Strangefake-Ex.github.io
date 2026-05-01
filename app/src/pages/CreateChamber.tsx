import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Menu, Shield, Sparkles, Swords, Wand2 } from 'lucide-react'

import {
  createLocalRoomRepository,
  type DiscussionMode,
  type SecurityLevel,
} from '@/repositories/roomRepository'
import AppNavDrawer from '@/components/AppNavDrawer'

type ModeCard = {
  key: DiscussionMode
  title: string
  subtitle: string
}

type SecurityCard = {
  key: SecurityLevel
  title: string
  subtitle: string
}

const MODE_CARDS: ModeCard[] = [
  { key: 'structured', title: 'Structured', subtitle: 'Round-robin speaking order' },
  { key: 'freeForm', title: 'Free Form', subtitle: 'Organic discussion flow' },
]

const SECURITY_CARDS: SecurityCard[] = [
  { key: 'fortified', title: 'Fortified', subtitle: 'Maximum safety & moderation' },
  { key: 'guarded', title: 'Guarded', subtitle: 'Balanced safety & spontaneity' },
  { key: 'open', title: 'Open', subtitle: 'Low-friction, high freedom' },
]

export default function CreateChamber() {
  const navigate = useNavigate()
  const repo = useMemo(() => createLocalRoomRepository(), [])

  const [name, setName] = useState('')
  const [topic, setTopic] = useState('')
  const [mode, setMode] = useState<DiscussionMode>('structured')
  const [security, setSecurity] = useState<SecurityLevel>('fortified')
  const [shieldStrength, setShieldStrength] = useState(85)
  const [aiGuardEnabled, setAiGuardEnabled] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const canSubmit = name.trim().length > 0 && topic.trim().length > 0

  async function onSubmit() {
    if (!canSubmit) return
    const created = await repo.createRoom({
      title: name.trim(),
      topic: topic.trim(),
      prompt: topic.trim(),
      mode,
      security,
      shieldStrength,
      aiGuardEnabled,
      capacity: 7,
      participants: 1,
    })
    navigate(`/room/${created.id}`)
  }

  return (
    <main className="relative z-10 min-h-dvh bg-transparent font-body text-[#1c1917] rt-page">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-6 focus:top-6 focus:z-50 focus:rounded-xl focus:bg-[#d7b25a] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-black"
        href="#main"
      >
        Skip to content
      </a>
      <div className="relative mx-auto max-w-5xl px-6 py-10" id="main">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              aria-label="Back"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#b9902e]/25 bg-white/55 text-[#1c1917] transition hover:bg-white/70"
              to="/"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#b9902e] text-black shadow-[0_18px_44px_rgba(185,144,46,0.18)]">
              <Shield className="h-5 w-5" />
            </div>
          </div>

          <button
            aria-label="Menu"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#b9902e]/25 bg-white/55 text-[#1c1917] transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35"
            type="button"
            onClick={() => setDrawerOpen((v) => !v)}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#b9902e]/25 bg-white/55 px-4 py-2 text-xs tracking-[0.18em] text-[#7a5b10]">
            <Sparkles className="h-3.5 w-3.5" />
            CREATE A CHAMBER
          </div>
          <h1 className="mt-6 font-display text-4xl font-semibold tracking-[-0.03em] text-[#1c1917]">
            Forge a New Chamber
          </h1>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div className="rt-surface rt-gild grid gap-4 rounded-3xl p-6">
              <div className="grid gap-2">
                <div className="text-xs font-semibold tracking-[0.14em] text-[#7a5b10]">CHAMBER NAME</div>
                <input
                  aria-label="Enter your round table's name…"
                  autoComplete="off"
                  className="h-12 rounded-2xl border border-[#b9902e]/18 bg-white/70 px-4 text-sm text-[#1c1917] placeholder:text-[#6b645c] focus:border-[#b9902e]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35"
                  name="chamberName"
                  placeholder="Enter your round table's name…"
                  spellCheck={false}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <div className="text-xs font-semibold tracking-[0.14em] text-[#7a5b10]">DISCUSSION TOPIC</div>
                <textarea
                  aria-label="What shall we deliberate upon…"
                  autoComplete="off"
                  className="min-h-28 rounded-2xl border border-[#b9902e]/18 bg-white/70 px-4 py-3 text-sm leading-7 text-[#1c1917] placeholder:text-[#6b645c] focus:border-[#b9902e]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35"
                  name="topic"
                  placeholder="What shall we deliberate upon…"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-6 rt-surface rt-gild rounded-3xl p-6">
              <div className="text-xs font-semibold tracking-[0.14em] text-[#7a5b10]">DISCUSSION MODE</div>
              <div className="mt-4 grid gap-3">
                {MODE_CARDS.map((c) => (
                  <button
                    key={c.key}
                    className={[
                      'flex items-center justify-between rounded-2xl border bg-white/55 p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35',
                      mode === c.key ? 'border-[#b9902e]/38' : 'border-[#b9902e]/18 hover:border-[#b9902e]/28',
                    ].join(' ')}
                    type="button"
                    onClick={() => setMode(c.key)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/60 text-[#7a5b10]">
                        {c.key === 'structured' ? <Swords className="h-5 w-5" /> : <Wand2 className="h-5 w-5" />}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[#1c1917]">{c.title}</div>
                        <div className="mt-1 text-xs text-[#4b463f]">{c.subtitle}</div>
                      </div>
                    </div>
                    {mode === c.key ? (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#b9902e] text-black">
                        <Check className="h-4 w-4" />
                      </div>
                    ) : (
                      <div className="h-3 w-3 rounded-full border border-[#b9902e]/30" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="rt-surface rt-gild rounded-3xl p-6">
              <div className="text-xs font-semibold tracking-[0.14em] text-[#7a5b10]">SECURITY SHIELD STRENGTH</div>
              <div className="mt-4 grid gap-3">
                <div className="grid gap-2">
                  <div className="text-sm font-semibold text-[#1c1917]">
                    Shield Integrity <span className="ml-2 text-[#7a5b10]">{shieldStrength}%</span>
                  </div>
                  <input
                    aria-label="Shield strength"
                    className="w-full accent-[#b9902e]"
                    max={100}
                    min={0}
                    type="range"
                    value={shieldStrength}
                    onChange={(e) => setShieldStrength(Number(e.target.value))}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {SECURITY_CARDS.map((c) => (
                    <button
                      key={c.key}
                      className={[
                        'rounded-2xl border px-3 py-3 text-left text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7b25a]/40',
                        security === c.key
                          ? 'border-[#b9902e]/40 bg-white/70 text-[#1c1917]'
                          : 'border-[#b9902e]/18 bg-white/55 text-[#1c1917] hover:border-[#b9902e]/28',
                      ].join(' ')}
                      type="button"
                      onClick={() => setSecurity(c.key)}
                    >
                      <div>{c.title}</div>
                      <div className="mt-1 text-[10px] font-normal leading-4 text-[#6b645c]">{c.subtitle}</div>
                    </button>
                  ))}
                </div>

                <button
                  className={[
                    'mt-2 flex w-full items-start gap-3 rounded-2xl border bg-white/55 p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/35',
                    aiGuardEnabled ? 'border-violet-600/40' : 'border-[#b9902e]/18 hover:border-[#b9902e]/28',
                  ].join(' ')}
                  type="button"
                  onClick={() => setAiGuardEnabled((v) => !v)}
                >
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-violet-200/60 text-violet-900">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-[#1c1917]">Enable AI Assistant</div>
                    <div className="mt-1 text-xs leading-6 text-[#4b463f]">
                      Real-time summaries, keyword highlights, and citations
                    </div>
                  </div>
                  <div
                    aria-hidden
                    className={[
                      'mt-1 h-6 w-10 rounded-full border transition',
                      aiGuardEnabled ? 'border-violet-600/50 bg-violet-500/25' : 'border-[#b9902e]/20 bg-white/55',
                    ].join(' ')}
                  >
                    <div
                      className={[
                        'h-5 w-5 translate-x-0.5 rounded-full bg-[#1c1917]/20 transition',
                        aiGuardEnabled ? 'translate-x-[18px] bg-violet-200' : 'bg-[#1c1917]/25',
                      ].join(' ')}
                    />
                  </div>
                </button>

                <button
                  className={[
                    'mt-2 inline-flex h-12 w-full items-center justify-center rounded-2xl px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7b25a]/50',
                    canSubmit
                      ? 'bg-[#b9902e] text-black hover:translate-y-[-1px]'
                      : 'cursor-not-allowed bg-white/55 text-[#6b645c] border border-[#b9902e]/18',
                  ].join(' ')}
                  disabled={!canSubmit}
                  type="button"
                  onClick={onSubmit}
                >
                  Establish Round Table
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
