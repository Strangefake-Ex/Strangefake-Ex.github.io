import { useMemo, useState } from 'react'
import { AlertTriangle, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react'

import type { Post } from '@/repositories/postRepository'
import type { Room } from '@/repositories/roomRepository'
import { computeKeywords as computeKeywordsFromPosts } from '@/lib/guardian'
import { createAiClient } from '@/services/aiClient'

type TabKey = 'keyPoints' | 'keywords' | 'citations'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function computeParticipationBalance(posts: Post[]) {
  if (posts.length === 0) return 78
  const counts = new Map<string, number>()
  for (const p of posts) counts.set(p.authorLabel, (counts.get(p.authorLabel) ?? 0) + 1)
  const total = posts.length
  const maxShare = Math.max(...[...counts.values()].map((c) => c / total))
  const raw = 100 - (maxShare - 1 / Math.max(1, counts.size)) * 180
  return clamp(Math.round(raw), 12, 98)
}

function computeKeyPoints(room: Room | null, posts: Post[]) {
  const base = posts
    .slice()
    .sort((a, b) => b.likes - a.likes || b.createdAt - a.createdAt)
    .slice(0, 3)
    .map((p) => p.content.trim())
    .filter(Boolean)

  if (base.length > 0) return base
  if (room?.prompt) return [room.prompt]
  return ['No key points yet.']
}

function computeCitations(posts: Post[]) {
  const corpus = posts.map((p) => p.content).join(' ').toLowerCase()
  const hits: string[] = []
  if (corpus.includes('habermas')) hits.push("Habermas — communicative action")
  if (corpus.includes('goffman')) hits.push("Goffman — face-work")
  if (corpus.includes('vygotsky')) hits.push("Vygotsky — scaffolding")
  if (hits.length > 0) return hits
  return ['No notable citations yet.']
}

export default function AiGuardianPanel({ room, posts }: { room: Room | null; posts: Post[] }) {
  const [tab, setTab] = useState<TabKey>('keyPoints')
  const [nonce, setNonce] = useState(0)
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null)
  const [alertExplanation, setAlertExplanation] = useState<Record<string, { explanation: string; evidence: string[] }>>({})
  const [explainBusy, setExplainBusy] = useState(false)

  const ai = useMemo(() => {
    const baseUrl = import.meta.env.VITE_AI_BASE_URL ? String(import.meta.env.VITE_AI_BASE_URL) : ''
    return createAiClient({ mode: baseUrl ? 'http' : 'stub', baseUrl })
  }, [])

  const participationBalance = useMemo(() => computeParticipationBalance(posts), [posts, nonce])
  const shieldIntegrity = useMemo(() => {
    const base = room?.shieldStrength ?? 78
    const delta = (participationBalance - 70) * 0.25
    return clamp(Math.round(base + delta), 0, 100)
  }, [participationBalance, room?.shieldStrength, nonce])

  const keyPoints = useMemo(() => computeKeyPoints(room, posts), [posts, room, nonce])
  const keywords = useMemo(() => computeKeywordsFromPosts(posts), [posts, nonce])
  const citations = useMemo(() => computeCitations(posts), [posts, nonce])
  const alerts = useMemo(() => {
    const a: Array<{ title: string; detail: string }> = []
    if (participationBalance < 55) {
      a.push({ title: 'Dominance Detected', detail: 'Invite quieter voices or enforce round-robin turns.' })
    }
    if (shieldIntegrity < 55) {
      a.push({ title: 'Shield Weakening', detail: 'Consider increasing security level or enabling AI Guard.' })
    }
    if (posts.length === 0) {
      a.push({ title: 'Cold Start', detail: 'Ask a low-stakes question to open the floor.' })
    }
    return a
  }, [participationBalance, posts.length, shieldIntegrity])

  return (
    <section className="rt-surface rt-gild rounded-3xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/70 text-[#7a5b10]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight">AI Guardian</h3>
            <div className="mt-1 text-xs text-[#4b463f]">Psychological Safety Shield</div>
          </div>
        </div>
        <button
          aria-label="Refresh analysis"
          className="rt-gild inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#b9902e]/24 bg-white/55 px-3 text-xs font-semibold text-[#1c1917] transition hover:border-[#b9902e]/34 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35"
          type="button"
          onClick={() => setNonce((n) => n + 1)}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh analysis
        </button>
      </div>

      <div className="mt-6 grid gap-4">
        <div className="rounded-2xl border border-[#b9902e]/18 bg-white/60 p-4">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 text-xs text-[#4b463f]">
              <ShieldCheck className="h-4 w-4" />
              Shield Integrity
            </div>
            <div className="text-sm font-semibold text-[#1c1917]">{shieldIntegrity}%</div>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#1c1917]/15">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-[#b9902e] to-violet-500"
              style={{ width: `${shieldIntegrity}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-[#b9902e]/18 bg-white/60 p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs tracking-[0.14em] text-[#4b463f]">PARTICIPATION BALANCE</div>
            <div className="text-sm font-semibold text-[#1c1917]">{participationBalance}%</div>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#1c1917]/15">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-500 via-[#b9902e] to-emerald-500"
              style={{ width: `${participationBalance}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-[#4b463f]">
            {participationBalance >= 70 ? 'Well balanced participation detected' : 'Dominance detected — invite quieter voices'}
          </div>
        </div>
      </div>

      {alerts.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-red-900/50 bg-red-950/10 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-red-200">
            <AlertTriangle className="h-4 w-4" />
            GUARDIAN ALERTS
          </div>
          <div className="mt-3 grid gap-2">
            {alerts.map((x) => {
              const open = expandedAlert === x.title
              const detail = alertExplanation[x.title]
              return (
                <div key={x.title} className="rounded-xl border border-red-900/30 bg-black/10 px-3 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-red-100">{x.title}</div>
                      <div className="mt-1 text-xs text-red-200/80">{x.detail}</div>
                    </div>
                    <button
                      className="inline-flex h-8 items-center justify-center rounded-lg border border-red-900/40 bg-black/10 px-3 text-[11px] font-semibold text-red-100 transition hover:border-red-700/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/40 disabled:opacity-50"
                      type="button"
                      disabled={explainBusy}
                      onClick={async () => {
                        setExpandedAlert(open ? null : x.title)
                        if (alertExplanation[x.title]) return
                        setExplainBusy(true)
                        try {
                          const res = await ai.explainAlert({
                            alertTitle: x.title,
                            alertDetail: x.detail,
                            context: { roomId: room?.id, roomTitle: room?.title, prompt: room?.prompt, topic: room?.topic, mode: room?.mode },
                          })
                          setAlertExplanation((prev) => ({ ...prev, [x.title]: res }))
                        } finally {
                          setExplainBusy(false)
                        }
                      }}
                    >
                      Why
                    </button>
                  </div>

                  {open ? (
                    <div className="mt-3 rounded-xl border border-red-900/30 bg-black/10 px-3 py-2">
                      <div className="text-[11px] font-semibold tracking-[0.14em] text-red-200">EXPLANATION</div>
                      <div className="mt-2 text-xs leading-6 text-red-100/90">{detail?.explanation ?? 'Loading…'}</div>
                      {detail?.evidence?.length ? (
                        <div className="mt-2 grid gap-1">
                          {detail.evidence.map((e) => (
                            <div key={e} className="text-[11px] text-red-200/80">
                              {e}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          className={[
            'h-9 rounded-xl px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35',
            tab === 'keyPoints' ? 'bg-[#b9902e] text-black' : 'border border-[#b9902e]/18 bg-white/60 text-[#1c1917] hover:bg-white/75',
          ].join(' ')}
          type="button"
          onClick={() => setTab('keyPoints')}
        >
          Key Points
        </button>
        <button
          className={[
            'h-9 rounded-xl px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35',
            tab === 'keywords' ? 'bg-[#b9902e] text-black' : 'border border-[#b9902e]/18 bg-white/60 text-[#1c1917] hover:bg-white/75',
          ].join(' ')}
          type="button"
          onClick={() => setTab('keywords')}
        >
          Keywords
        </button>
        <button
          className={[
            'h-9 rounded-xl px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35',
            tab === 'citations' ? 'bg-[#b9902e] text-black' : 'border border-[#b9902e]/18 bg-white/60 text-[#1c1917] hover:bg-white/75',
          ].join(' ')}
          type="button"
          onClick={() => setTab('citations')}
        >
          Notable Citations
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-[#b9902e]/20 bg-white/55 p-4">
        {tab === 'keyPoints' ? (
          <ul className="grid gap-3 text-sm leading-7 text-[#1c1917]">
            {keyPoints.map((p, i) => (
              <li key={`${i}-${p}`} className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#d7b25a]" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {tab === 'keywords' ? (
          <div className="flex flex-wrap gap-2">
            {keywords.length === 0 ? <div className="text-sm text-[#4b463f]">No keywords yet.</div> : null}
            {keywords.map((k) => (
              <span key={k} className="rounded-full border border-[#b9902e]/18 bg-white/60 px-3 py-1 text-xs text-[#1c1917]">
                {k}
              </span>
            ))}
          </div>
        ) : null}

        {tab === 'citations' ? (
          <ul className="grid gap-3 text-sm leading-7 text-[#1c1917]">
            {citations.map((c, i) => (
              <li key={`${i}-${c}`} className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-300" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  )
}
