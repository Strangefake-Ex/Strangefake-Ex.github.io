import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Download,
  Gauge,
  Menu,
  RefreshCw,
  Shield,
  Sparkles,
  Swords,
  Users2,
} from 'lucide-react'

import AppNavDrawer from '@/components/AppNavDrawer'
import HelmSigil from '@/components/HelmSigil'
import { createLocalPostRepository, type Post } from '@/repositories/postRepository'
import { createLocalRoomRepository, type Room } from '@/repositories/roomRepository'
import { createLocalSessionRepository, type StructuredSession } from '@/repositories/sessionRepository'
import { createLocalDraftRepository, type Draft } from '@/repositories/draftRepository'
import { createAiClient } from '@/services/aiClient'
import { getJson, removeKey, setJson, subscribeKey } from '@/lib/localStore'
import { draftsKey, facControlKey, facEventsKey, facPollVotesKey, facRulesKey, postsKey, sessionKey } from '@/lib/storageKeys'
import useAuthSession from '@/hooks/useAuthSession'
import { computeVirtualRange } from '@/lib/virtualList'

type ParticipantRow = {
  label: string
  posts: number
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x.getTime()
}

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const a = ((angle - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle)
  const end = polarToCartesian(cx, cy, r, startAngle)
  const large = endAngle - startAngle <= 180 ? '0' : '1'
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y}`
}

function initials(label: string) {
  const parts = label.trim().split(/\s+/g)
  const a = parts[0]?.[0] ?? '?'
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : ''
  return `${a}${b}`.toUpperCase()
}

function formatAgo(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
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

function buildSummary(room: Room | null, posts: Post[]) {
  const lines: string[] = []
  lines.push(`# Facilitator Summary: ${room?.title ?? 'Round Table Session'}`)
  if (room?.course) lines.push(`Course: ${room.course}`)
  lines.push('')
  lines.push(`Prompt: ${room?.prompt ?? ''}`)
  lines.push('')
  lines.push('## Key Points')
  for (const p of posts) {
    lines.push(`- ${p.content}`)
  }
  lines.push('')
  return lines.join('\n')
}

type AlertSeverity = 'critical' | 'warning' | 'info'
type GuardianAlert = {
  id: string
  title: string
  severity: AlertSeverity
  detail: string
  involved: string[]
}

type FairnessRules = {
  silenceSeconds: number
  dominanceSharePct: number
  consecutivePosts: number
}

type FacilitatorControl = {
  paused?: boolean
  promptCard?: { id: string; text: string; createdAt: number }
  poll?: { id: string; question: string; options: string[]; createdAt: number }
}

type FacilitatorEvent =
  | { id: string; at: number; actor: string | null; kind: 'pause' | 'resume' }
  | { id: string; at: number; actor: string | null; kind: 'next-speaker' }
  | { id: string; at: number; actor: string | null; kind: 'prompt'; text: string }
  | { id: string; at: number; actor: string | null; kind: 'poll-start'; pollId: string; question: string; options: string[] }
  | { id: string; at: number; actor: string | null; kind: 'rules'; rules: FairnessRules }

function createEventId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function loadEvents(roomId: string | undefined | null) {
  if (!roomId) return []
  return (getJson<FacilitatorEvent[]>(facEventsKey(roomId)) ?? []) as FacilitatorEvent[]
}

function loadRules(roomId: string | undefined | null): FairnessRules {
  const fallback: FairnessRules = { silenceSeconds: 180, dominanceSharePct: 55, consecutivePosts: 3 }
  if (!roomId) return fallback
  const parsed = getJson<Partial<FairnessRules>>(facRulesKey(roomId)) ?? {}
  return {
    silenceSeconds: typeof parsed.silenceSeconds === 'number' ? parsed.silenceSeconds : fallback.silenceSeconds,
    dominanceSharePct: typeof parsed.dominanceSharePct === 'number' ? parsed.dominanceSharePct : fallback.dominanceSharePct,
    consecutivePosts: typeof parsed.consecutivePosts === 'number' ? parsed.consecutivePosts : fallback.consecutivePosts,
  }
}

function loadControl(roomId: string | undefined | null): FacilitatorControl | null {
  if (!roomId) return null
  return (getJson<FacilitatorControl>(facControlKey(roomId)) as FacilitatorControl | null) ?? null
}

function buildFacilitatorExport(input: {
  room: Room | null
  posts: Post[]
  rules: FairnessRules
  events: FacilitatorEvent[]
  poll: { question: string; options: string[]; counts: Record<string, number> } | null
  metrics: { densityPerMin: number; avgResponseSec: number; coveragePct: number; coverageRecentPct: number; silenceSegments: number }
}) {
  const lines: string[] = []
  const roomTitle = input.room?.title ?? 'Round Table Session'
  lines.push(`# Round Table Report: ${roomTitle}`)
  lines.push(`Generated: ${new Date().toISOString()}`)
  if (input.room?.course) lines.push(`Course: ${input.room.course}`)
  if (input.room?.topic) lines.push(`Topic: ${input.room.topic}`)
  lines.push('')
  lines.push(`Prompt: ${input.room?.prompt ?? ''}`)
  lines.push('')

  lines.push('## Fairness Rules')
  lines.push(`- Silence Threshold: ${input.rules.silenceSeconds}s`)
  lines.push(`- Dominance Share: ${input.rules.dominanceSharePct}%`)
  lines.push(`- Consecutive Posts: ${input.rules.consecutivePosts}`)
  lines.push('')

  lines.push('## Metrics')
  lines.push(`- Msg/min (10m): ${input.metrics.densityPerMin}`)
  lines.push(`- Avg response: ${input.metrics.avgResponseSec}s`)
  lines.push(`- Coverage: ${input.metrics.coveragePct}%`)
  lines.push(`- Coverage (10m): ${input.metrics.coverageRecentPct}%`)
  lines.push(`- Silence gaps: ${input.metrics.silenceSegments}`)
  lines.push('')

  if (input.poll) {
    lines.push('## Poll')
    lines.push(`Question: ${input.poll.question}`)
    for (const o of input.poll.options) {
      lines.push(`- ${o}: ${input.poll.counts[o] ?? 0}`)
    }
    lines.push('')
  }

  lines.push('## Timeline')
  if (input.events.length === 0) {
    lines.push('- (none)')
  } else {
    for (const e of input.events.slice(-50)) {
      const when = new Date(e.at).toISOString()
      const actor = e.actor ? ` (${e.actor})` : ''
      if (e.kind === 'pause') lines.push(`- ${when}${actor}: Paused discussion`)
      else if (e.kind === 'resume') lines.push(`- ${when}${actor}: Resumed discussion`)
      else if (e.kind === 'next-speaker') lines.push(`- ${when}${actor}: Advanced speaker`)
      else if (e.kind === 'prompt') lines.push(`- ${when}${actor}: Prompt card — ${e.text}`)
      else if (e.kind === 'poll-start') lines.push(`- ${when}${actor}: Poll started — ${e.question}`)
      else lines.push(`- ${when}${actor}: Rules updated`)
    }
  }
  lines.push('')

  lines.push('## Highlights')
  for (const p of input.posts.slice(0, 12)) {
    lines.push(`- “${p.content.slice(0, 140)}${p.content.length > 140 ? '…' : ''}” — ${p.authorLabel}`)
  }
  lines.push('')

  return lines.join('\n')
}

function buildHourHeatmap(posts: Post[], opts: { days: number; startHour: number; endHour: number }) {
  const { days, startHour, endHour } = opts
  const today = startOfDay(new Date())
  const startDay = today - (days - 1) * 24 * 60 * 60 * 1000
  const cols = endHour - startHour + 1
  const grid: number[][] = Array.from({ length: days }, () => Array.from({ length: cols }, () => 0))
  let total = 0
  for (const p of posts) {
    const d = new Date(p.createdAt)
    const day = startOfDay(d)
    if (day < startDay || day > today) continue
    const row = Math.floor((day - startDay) / (24 * 60 * 60 * 1000))
    const hour = d.getHours()
    if (hour < startHour || hour > endHour) continue
    const col = hour - startHour
    grid[row]![col] = (grid[row]![col] ?? 0) + 1
    total += 1
  }

  const columnTotals = Array.from({ length: cols }, (_, i) => grid.reduce((sum, row) => sum + (row[i] ?? 0), 0))
  const peakIndex = columnTotals.reduce((best, x, i) => (x > (columnTotals[best] ?? 0) ? i : best), 0)
  const peakHour = startHour + peakIndex
  const max = Math.max(1, ...grid.flat())
  return { grid, cols, max, total, peakHour }
}

export default function Facilitator() {
  const { roomId } = useParams()
  const roomRepo = useMemo(() => createLocalRoomRepository(), [])
  const postRepo = useMemo(() => createLocalPostRepository(), [])
  const sessionRepo = useMemo(() => createLocalSessionRepository(), [])
  const draftRepo = useMemo(() => createLocalDraftRepository(), [])
  const { session: authSession } = useAuthSession()
  const ai = useMemo(() => {
    const baseUrl = import.meta.env.VITE_AI_BASE_URL ? String(import.meta.env.VITE_AI_BASE_URL) : ''
    const mode = (baseUrl || import.meta.env.PROD) ? 'http' : 'stub'
    return createAiClient({ mode, baseUrl })
  }, [])

  const [room, setRoom] = useState<Room | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [rows, setRows] = useState<ParticipantRow[]>([])
  const [session, setSession] = useState<StructuredSession | null>(null)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [weaves, setWeaves] = useState<Record<string, { script: string; followUps: string[] }>>({})
  const [mutedAlerts, setMutedAlerts] = useState(false)
  const [dismissedAlerts, setDismissedAlerts] = useState<Record<string, boolean>>({})
  const [alertExpanded, setAlertExpanded] = useState<Record<string, boolean>>({})
  const [alertExplains, setAlertExplains] = useState<Record<string, { explanation: string; evidence: string[] }>>({})
  const [reportOpen, setReportOpen] = useState<Record<string, boolean>>({ distribution: true, recommendations: false, highlights: false })
  const [reportUpdatedAt, setReportUpdatedAt] = useState<number>(() => Date.now())
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [rules, setRules] = useState<FairnessRules>(() => loadRules(roomId))
  const [control, setControl] = useState<FacilitatorControl | null>(() => loadControl(roomId))
  const [events, setEvents] = useState<FacilitatorEvent[]>(() => loadEvents(roomId))
  const [participantScrollTop, setParticipantScrollTop] = useState(0)
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    roomRepo.listRooms().then(setRooms)
  }, [roomRepo])

  useEffect(() => {
    setRules(loadRules(roomId))
    if (!roomId) return
    return subscribeKey(facRulesKey(roomId), () => setRules(loadRules(roomId)))
  }, [roomId])

  useEffect(() => {
    setControl(loadControl(roomId))
    if (!roomId) return
    return subscribeKey(facControlKey(roomId), () => setControl(loadControl(roomId)))
  }, [roomId])

  useEffect(() => {
    setEvents(loadEvents(roomId))
    if (!roomId) return
    return subscribeKey(facEventsKey(roomId), () => setEvents(loadEvents(roomId)))
  }, [roomId])

  useEffect(() => {
    if (!roomId) return
    const loadRoom = () => roomRepo.getRoom(roomId).then(setRoom)
    const loadPosts = () => postRepo.listPosts(roomId).then(setPosts)
    loadRoom()
    loadPosts()
    const unsubPosts = subscribeKey(postsKey(roomId), () => loadPosts())
    return () => {
      unsubPosts()
    }
  }, [postRepo, roomId, roomRepo])

  useEffect(() => {
    if (!roomId) return
    const t = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [roomId])

  useEffect(() => {
    if (!roomId) return
    const load = () => sessionRepo.getSession(roomId).then(setSession)
    load()
    return subscribeKey(sessionKey(roomId), () => load())
  }, [roomId, sessionRepo])

  useEffect(() => {
    if (!roomId) return
    const load = async () => setDrafts(await draftRepo.listDrafts(roomId))
    load()
    return subscribeKey(draftsKey(roomId), () => load())
  }, [draftRepo, roomId])

  useEffect(() => {
    const counts = new Map<string, number>()
    for (const p of posts) counts.set(p.authorLabel, (counts.get(p.authorLabel) ?? 0) + 1)
    setRows(
      [...counts.entries()]
        .map(([label, count]) => ({ label, posts: count }))
        .sort((a, b) => b.posts - a.posts),
    )
  }, [posts])

  const participationBalance = useMemo(() => computeParticipationBalance(posts), [posts])
  const activeParticipants = rows.length
  const avgImpact = useMemo(() => {
    const totalLikes = posts.reduce((sum, p) => sum + p.likes, 0)
    const base = totalLikes * 18 + posts.length * 10
    return clamp(Math.round(base / Math.max(1, posts.length)), 10, 99)
  }, [posts])

  const nearContributions = useMemo(
    () =>
      drafts
        .filter((d) => d.status === 'draft' && d.text.trim().length > 0)
        .sort((a, b) => b.lastActivityAt - a.lastActivityAt)
        .slice(0, 6),
    [drafts],
  )
  const draftingNow = useMemo(() => nearContributions.filter((d) => nowMs - d.lastActivityAt < 30_000).length, [nearContributions, nowMs])
  const silenceSeconds = useMemo(() => {
    const last = posts.slice().sort((a, b) => b.createdAt - a.createdAt)[0]?.createdAt ?? 0
    if (!last) return posts.length === 0 ? 0 : 0
    return Math.max(0, Math.floor((nowMs - last) / 1000))
  }, [nowMs, posts])
  const alerts: GuardianAlert[] = useMemo(() => {
    if (mutedAlerts) return []
    const next: GuardianAlert[] = []
    const top = rows[0]?.label
    const topCount = rows[0]?.posts ?? 0
    const total = Math.max(1, posts.length)
    const dominanceShare = top ? Math.round((topCount / total) * 100) : 0

    if (posts.length === 0) {
      next.push({
        id: 'cold-start',
        title: 'Cold Start',
        severity: 'info',
        detail: 'Begin with a low-stakes prompt, then invite one concrete example.',
        involved: [],
      })
    }

    if (silenceSeconds >= rules.silenceSeconds) {
      next.push({
        id: 'silence',
        title: 'Silence Stretch',
        severity: silenceSeconds >= rules.silenceSeconds * 2 ? 'warning' : 'info',
        detail: `No messages for ${silenceSeconds}s. Consider a quick check-in question.`,
        involved: [],
      })
    }

    if (top && dominanceShare >= rules.dominanceSharePct) {
      next.push({
        id: 'imbalance',
        title: 'Participation Imbalance',
        severity: dominanceShare >= Math.min(90, rules.dominanceSharePct + 15) ? 'critical' : 'warning',
        detail: `${top} contributed ${dominanceShare}% of recent messages. Invite quieter voices or advance turns.`,
        involved: [top],
      })
    }

    if (rules.consecutivePosts >= 2 && posts.length >= rules.consecutivePosts) {
      const sorted = posts.slice().sort((a, b) => b.createdAt - a.createdAt)
      const first = sorted[0]
      if (first) {
        let streak = 1
        for (let i = 1; i < sorted.length; i++) {
          if (sorted[i]!.authorLabel !== first.authorLabel) break
          streak += 1
        }
        if (streak >= rules.consecutivePosts) {
          next.push({
            id: 'streak',
            title: 'Rapid Streak',
            severity: streak >= rules.consecutivePosts + 2 ? 'critical' : 'warning',
            detail: `${first.authorLabel} posted ${streak} times in a row. Consider inviting another voice.`,
            involved: [first.authorLabel],
          })
        }
      }
    }

    if (room?.mode === 'structured' && !session) {
      next.push({
        id: 'no-session',
        title: 'Turn Order Missing',
        severity: 'warning',
        detail: 'Ask someone to claim a seat to initialize the round-robin session.',
        involved: [],
      })
    }

    return next.filter((a) => !dismissedAlerts[a.id])
  }, [
    dismissedAlerts,
    mutedAlerts,
    posts,
    room?.mode,
    rows,
    rules.consecutivePosts,
    rules.dominanceSharePct,
    rules.silenceSeconds,
    session,
    silenceSeconds,
  ])

  const distribution = useMemo(() => {
    const total = rows.reduce((sum, r) => sum + r.posts, 0)
    const colors = ['#b9902e', '#7c3aed', '#059669', '#dc2626', '#2563eb', '#9a3412', '#0f766e']
    const segments = rows.slice(0, 6).map((r, idx) => ({ label: r.label, value: r.posts, color: colors[idx % colors.length] }))
    const sumSegments = segments.reduce((s, x) => s + x.value, 0)
    if (total > sumSegments) segments.push({ label: 'Others', value: total - sumSegments, color: '#6b645c' })
    return { total, segments }
  }, [rows])

  const engagement = useMemo(() => {
    const recent = posts.filter((p) => nowMs - p.createdAt < 10 * 60 * 1000).length
    if (recent >= 12) return { label: 'High', sub: `+${Math.round((recent / 10) * 10)}% from average` }
    if (recent >= 5) return { label: 'Medium', sub: 'Steady rhythm' }
    return { label: 'Low', sub: 'Needs a prompt' }
  }, [nowMs, posts])

  const hourHeatmap = useMemo(() => buildHourHeatmap(posts, { days: 7, startHour: 9, endHour: 21 }), [posts])

  const participantBreakdown = useMemo(() => {
    const byLabel = new Map<string, { label: string; lastAt: number; count: number }>()
    for (const p of posts) {
      const existing = byLabel.get(p.authorLabel)
      const next = {
        label: p.authorLabel,
        lastAt: Math.max(existing?.lastAt ?? 0, p.createdAt),
        count: (existing?.count ?? 0) + 1,
      }
      byLabel.set(p.authorLabel, next)
    }
    const list = [...byLabel.values()].sort((a, b) => b.count - a.count)
    const total = Math.max(1, posts.length)
    return list.map((x) => {
      const share = x.count / total
      const tag = share >= 0.22 ? 'High' : share >= 0.12 ? 'Medium' : 'Low'
      return { ...x, tag }
    })
  }, [posts])

  const metrics = useMemo(() => {
    const totalLikes = posts.reduce((sum, p) => sum + p.likes, 0)
    const totalWords = posts.reduce((sum, p) => {
      const t = p.content.trim()
      if (!t) return sum
      const hasSpaces = /\s/.test(t)
      const words = hasSpaces ? t.split(/\s+/g).filter(Boolean).length : Math.max(1, Math.round(t.length / 2))
      return sum + words
    }, 0)
    const sorted = posts.slice().sort((a, b) => a.createdAt - b.createdAt)
    const gaps = sorted.length >= 2 ? sorted.slice(1).map((p, i) => Math.max(0, p.createdAt - sorted[i]!.createdAt)) : []
    const avgGapMs = gaps.length ? gaps.reduce((s, x) => s + x, 0) / gaps.length : 0
    const avgResponseSec = avgGapMs ? Math.round(avgGapMs / 1000) : 0
    const windowMs = 10 * 60 * 1000
    const recentPosts = posts.filter((p) => nowMs - p.createdAt <= windowMs)
    const recentCount = recentPosts.length
    const densityPerMin = Math.round((recentCount / 10) * 10) / 10
    const capacity = room?.capacity ?? participantBreakdown.length
    const coveragePct = Math.round((participantBreakdown.length / Math.max(1, capacity)) * 100)
    const recentParticipants = new Set(recentPosts.map((p) => p.authorLabel)).size
    const coverageRecentPct = Math.round((recentParticipants / Math.max(1, capacity)) * 100)
    const silenceSegments = gaps.filter((g) => g >= rules.silenceSeconds * 1000).length
    const turnSeconds = session?.turnSeconds ?? null
    const turnRemainingSec = session ? Math.max(0, Math.ceil((session.turnEndsAt - nowMs) / 1000)) : null
    return { totalLikes, totalWords, avgResponseSec, densityPerMin, coveragePct, coverageRecentPct, silenceSegments, turnSeconds, turnRemainingSec }
  }, [nowMs, participantBreakdown.length, posts, room?.capacity, rules.silenceSeconds, session])

  const trend30m = useMemo(() => {
    const buckets = Array.from({ length: 30 }, () => 0)
    for (const p of posts) {
      const ageMin = Math.floor((nowMs - p.createdAt) / 60_000)
      if (ageMin < 0 || ageMin >= 30) continue
      const idx = 29 - ageMin
      buckets[idx] = (buckets[idx] ?? 0) + 1
    }
    const max = Math.max(1, ...buckets)
    return { buckets, max }
  }, [nowMs, posts])

  const trendCumulative = useMemo(() => {
    if (posts.length === 0) return { points: Array.from({ length: 24 }, () => 0), max: 1 }
    const sorted = posts.slice().sort((a, b) => a.createdAt - b.createdAt)
    const first = sorted[0]!.createdAt
    const last = sorted[sorted.length - 1]!.createdAt
    const span = Math.max(1, last - first)
    const points = Array.from({ length: 24 }, (_, i) => {
      const t = first + (span * i) / 23
      const count = sorted.findIndex((p) => p.createdAt > t)
      return count === -1 ? sorted.length : count
    })
    const max = Math.max(1, ...points)
    return { points, max }
  }, [posts])

  const report = useMemo(() => {
    const score = clamp(participationBalance, 0, 99)
    const prevKey = roomId ? `rt:fac-report:${roomId}` : 'rt:fac-report:unknown'
    const prevRaw = localStorage.getItem(prevKey)
    const prevScore = prevRaw ? Number(prevRaw) : null
    const delta = prevScore == null ? null : score - prevScore
    const recommendations = [
      participationBalance < 65 ? 'Invite one quiet voice with a specific question.' : 'Ask for a counterexample to deepen the argument.',
      silenceSeconds >= 180 ? 'Use a quick “agree / disagree / unsure” poll question.' : 'Summarize two viewpoints and ask for synthesis.',
      draftingNow > 0 ? 'Call on someone drafting privately and offer a gentle bridge into the room.' : 'Request one concrete example before moving on.',
    ]
    const highlights = posts.slice(0, 5).map((p) => `“${p.content.slice(0, 120)}${p.content.length > 120 ? '…' : ''}” — ${p.authorLabel}`)
    return { score, delta, recommendations, highlights }
  }, [draftingNow, participationBalance, posts, roomId, silenceSeconds])

  const pollResults = useMemo(() => {
    if (!roomId) return null
    const poll = control?.poll
    if (!poll) return null
    try {
      const votes = getJson<Record<string, string>>(facPollVotesKey(roomId, poll.id)) ?? {}
      const counts: Record<string, number> = {}
      for (const o of poll.options) counts[o] = 0
      for (const v of Object.values(votes)) counts[v] = (counts[v] ?? 0) + 1
      const total = Math.max(1, Object.values(counts).reduce((s, x) => s + x, 0))
      return { poll, counts, total }
    } catch {
      return { poll, counts: Object.fromEntries(poll.options.map((o) => [o, 0])), total: 1 }
    }
  }, [control?.poll, roomId])

  const actor = authSession?.nickname ?? null

  function writeEvents(nextEvents: FacilitatorEvent[]) {
    if (!roomId) return
    const trimmed = nextEvents.slice(-240)
    setEvents(trimmed)
    setJson(facEventsKey(roomId), trimmed)
  }

  function pushEvent(next: FacilitatorEvent) {
    if (!roomId) return
    writeEvents([...loadEvents(roomId), next])
  }

  function upsertRulesEvent(nextRules: FairnessRules) {
    if (!roomId) return
    const current = loadEvents(roomId)
    const now = Date.now()
    const last = current[current.length - 1]
    if (last && last.kind === 'rules' && now - last.at < 1200 && last.actor === actor) {
      const next: FacilitatorEvent = { ...last, at: now, rules: nextRules }
      writeEvents([...current.slice(0, -1), next])
      return
    }
    pushEvent({ id: createEventId(), at: now, actor, kind: 'rules', rules: nextRules })
  }

  function eventTitle(e: FacilitatorEvent) {
    if (e.kind === 'pause') return 'Paused discussion'
    if (e.kind === 'resume') return 'Resumed discussion'
    if (e.kind === 'next-speaker') return 'Advanced speaker'
    if (e.kind === 'prompt') return 'Prompt card'
    if (e.kind === 'poll-start') return 'Poll started'
    return 'Rules updated'
  }

  function eventDetail(e: FacilitatorEvent) {
    if (e.kind === 'prompt') return e.text
    if (e.kind === 'poll-start') return e.question
    if (e.kind === 'rules') return `Silence ${e.rules.silenceSeconds}s · Dominance ${e.rules.dominanceSharePct}% · Streak ${e.rules.consecutivePosts}`
    return null
  }

  async function onAdvanceTurn() {
    if (!roomId) return
    setSession(await sessionRepo.advanceTurn(roomId))
    pushEvent({ id: createEventId(), at: Date.now(), actor, kind: 'next-speaker' })
  }

  async function onMakeSpeaker(speakerId: string) {
    if (!roomId) return
    setSession(await sessionRepo.setCurrentSpeaker(roomId, speakerId))
  }

  async function onMove(participantId: string, delta: -1 | 1) {
    if (!roomId) return
    setSession(await sessionRepo.moveParticipant(roomId, participantId, delta))
  }

  function onExport() {
    const content = buildFacilitatorExport({
      room,
      posts,
      rules,
      events,
      poll: pollResults ? { question: pollResults.poll.question, options: pollResults.poll.options, counts: pollResults.counts } : null,
      metrics: {
        densityPerMin: metrics.densityPerMin,
        avgResponseSec: metrics.avgResponseSec,
        coveragePct: metrics.coveragePct,
        coverageRecentPct: metrics.coverageRecentPct,
        silenceSegments: metrics.silenceSegments,
      },
    })
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${room?.title ?? 'round-table'}-summary.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  function saveRules(patch: Partial<FairnessRules>) {
    if (!roomId) return
    const next: FairnessRules = {
      silenceSeconds: typeof patch.silenceSeconds === 'number' ? patch.silenceSeconds : rules.silenceSeconds,
      dominanceSharePct: typeof patch.dominanceSharePct === 'number' ? patch.dominanceSharePct : rules.dominanceSharePct,
      consecutivePosts: typeof patch.consecutivePosts === 'number' ? patch.consecutivePosts : rules.consecutivePosts,
    }
    setRules(next)
    setJson(facRulesKey(roomId), next)
    upsertRulesEvent(next)
  }

  function saveControl(patch: Partial<FacilitatorControl>) {
    if (!roomId) return
    const next: FacilitatorControl = { ...(control ?? {}), ...patch }
    setControl(next)
    setJson(facControlKey(roomId), next)
  }

  return (
    <main className="relative z-10 min-h-dvh bg-transparent font-body text-[#1c1917] rt-page">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-6 focus:top-6 focus:z-50 focus:rounded-xl focus:bg-[#d7b25a] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-black"
        href="#main"
      >
        Skip to content
      </a>
      <div className="mx-auto max-w-6xl px-6 py-10" id="main">
        <div className="rt-surface rt-gild relative overflow-hidden rounded-[32px] px-6 py-6 shadow-[0_30px_90px_rgba(20,17,15,0.10)]">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-36 -top-44 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(185,144,46,0.26)_0%,rgba(246,237,215,0)_62%)] blur-[0.5px]" />
            <div className="absolute -bottom-44 -right-44 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(78,63,159,0.12)_0%,rgba(246,237,215,0)_64%)] blur-[0.5px]" />
          </div>

          <div className="pointer-events-none absolute -right-12 -top-10 hidden opacity-[0.85] sm:block">
            <HelmSigil className="h-[240px] w-[240px] rt-rotate-slow" segments={distribution.segments.slice(0, 6)} />
          </div>

          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div className="min-w-[260px]">
              <div className="inline-flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#b9902e] text-black shadow-[0_18px_44px_rgba(185,144,46,0.16)]">
                  <Swords className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-3xl font-semibold tracking-[-0.02em]">Facilitator&apos;s Helm</h1>
                  <div className="mt-1 text-sm text-[#4b463f]">{room?.title ?? 'Monitor and guide the Round Table discussions'}</div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {rooms.slice(0, 6).map((r) => (
                  <Link
                    key={r.id}
                    className={[
                      'rt-gild inline-flex h-9 items-center justify-center rounded-xl px-4 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35',
                      r.id === roomId ? 'bg-[#b9902e] text-black' : 'border border-[#b9902e]/18 bg-white/65 text-[#1c1917] hover:bg-white/85',
                    ].join(' ')}
                    to={`/facilitator/${r.id}`}
                  >
                    {r.topic || r.title}
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                aria-label="Menu"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#b9902e]/20 bg-white/70 text-[#1c1917] transition hover:bg-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35"
                type="button"
                onClick={() => setDrawerOpen((v) => !v)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <button
                className="rt-gild inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#b9902e]/20 bg-white/70 px-4 text-sm font-semibold text-[#1c1917] transition hover:bg-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35"
                type="button"
                onClick={onExport}
              >
                <Download className="h-4 w-4" />
                Export Summary
              </button>
              <Link className="text-sm text-[#4b463f] hover:text-[#1c1917]" to={roomId ? `/room/${roomId}` : '/lobby'}>
                Back to Room
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4 rt-fade-up">
          <div className="rt-surface rt-gild rounded-3xl p-5 shadow-[0_20px_70px_rgba(20,17,15,0.10)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold tracking-[0.16em] text-[#7a5b10]">ACTIVE KNIGHTS</div>
                <div className="mt-3 text-4xl font-semibold tracking-tight text-[#1c1917]">{activeParticipants}</div>
                <div className="mt-1 text-xs text-[#4b463f]">{activeParticipants > 0 ? 'Active participation detected' : 'Waiting for first voice'}</div>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#b9902e]/20 bg-white/70 text-[#7a5b10]">
                <Users2 className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="rt-surface rt-gild rounded-3xl p-5 shadow-[0_20px_70px_rgba(20,17,15,0.10)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold tracking-[0.16em] text-[#7a5b10]">SHIELD STATUS</div>
                <div className="mt-3 text-4xl font-semibold tracking-tight text-[#1c1917]">{participationBalance}%</div>
                <div className="mt-1 text-xs text-[#4b463f]">{participationBalance >= 70 ? 'Healthy participation' : 'Needs support'}</div>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#b9902e]/20 bg-white/70 text-[#7a5b10]">
                <Shield className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="rt-surface rt-gild rounded-3xl p-5 shadow-[0_20px_70px_rgba(20,17,15,0.10)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold tracking-[0.16em] text-[#7a5b10]">GUARDIAN ALERTS</div>
                <div className="mt-3 text-4xl font-semibold tracking-tight text-[#1c1917]">{alerts.length}</div>
                <div className="mt-1 text-xs text-[#4b463f]">{alerts.length > 0 ? 'Needs attention' : 'All clear'}</div>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#b9902e]/20 bg-white/70 text-[#7a5b10]">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="rt-surface rt-gild rounded-3xl p-5 shadow-[0_20px_70px_rgba(20,17,15,0.10)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold tracking-[0.16em] text-[#7a5b10]">ENGAGEMENT</div>
                <div className="mt-3 text-4xl font-semibold tracking-tight text-[#1c1917]">{engagement.label}</div>
                <div className="mt-1 text-xs text-[#4b463f]">{engagement.sub}</div>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#b9902e]/20 bg-white/70 text-[#7a5b10]">
                <Gauge className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <section className="lg:col-span-7">
            <div className="rt-surface rt-gild rounded-3xl p-6">
              <div className="text-xs font-semibold tracking-[0.16em] text-[#7a5b10]">PROMPT</div>
              <div className="mt-3 text-sm leading-7 text-[#1c1917]">{room?.prompt ?? '—'}</div>
            </div>

            <div className="mt-6 rt-surface rt-gild rounded-3xl p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold tracking-tight text-[#1c1917]">Participation Distribution</div>
                  <div className="mt-1 text-xs text-[#4b463f]">Real-time engagement metrics</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-semibold text-[#1c1917]">{distribution.total}</div>
                  <div className="text-xs text-[#4b463f]">Total contributions</div>
                </div>
              </div>

              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <div className="flex items-center justify-center">
                  <svg width="220" height="220" viewBox="0 0 220 220" aria-label="Participation donut">
                    <circle cx="110" cy="110" r="76" stroke="rgba(28,25,23,0.10)" strokeWidth="18" fill="none" />
                    {(() => {
                      const total = Math.max(1, distribution.segments.reduce((s, x) => s + x.value, 0))
                      let start = 0
                      return distribution.segments.map((s) => {
                        const angle = (s.value / total) * 360
                        const end = start + angle
                        const d = describeArc(110, 110, 76, start, end)
                        start = end
                        return <path key={s.label} d={d} stroke={s.color} strokeWidth="18" fill="none" strokeLinecap="round" opacity={0.95} />
                      })
                    })()}
                    <circle cx="110" cy="110" r="54" fill="rgba(255,255,255,0.70)" stroke="rgba(185,144,46,0.16)" />
                    <text x="110" y="108" textAnchor="middle" className="fill-[#1c1917] text-base font-semibold">
                      Round Table
                    </text>
                    <text x="110" y="130" textAnchor="middle" className="fill-[#4b463f] text-xs">
                      {activeParticipants} Knights
                    </text>
                  </svg>
                </div>

                <div className="grid gap-3">
                  {distribution.segments.slice(0, 6).map((s) => {
                    const total = Math.max(1, distribution.total)
                    const pct = Math.round((s.value / total) * 100)
                    return (
                      <div key={s.label} className="rounded-2xl border border-[#b9902e]/14 bg-white/55 px-4 py-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                            <div className="truncate text-sm font-semibold text-[#1c1917]">{s.label}</div>
                          </div>
                          <div className="text-sm font-semibold text-[#1c1917]">{pct}%</div>
                        </div>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#1c1917]/10">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: s.color }} />
                        </div>
                      </div>
                    )
                  })}

                  <div className="mt-1 grid grid-cols-3 gap-2">
                    <div className="rt-subpanel rounded-2xl p-3 text-center">
                      <div className="text-xs tracking-[0.14em] text-[#6b645c]">BALANCE</div>
                      <div className="mt-1 text-lg font-semibold text-[#1c1917]">{participationBalance}%</div>
                      <div className="text-xs text-[#4b463f]">{participationBalance >= 70 ? 'Equitable' : 'Skewed'}</div>
                    </div>
                    <div className="rt-subpanel rounded-2xl p-3 text-center">
                      <div className="text-xs tracking-[0.14em] text-[#6b645c]">DOMINANCE</div>
                      <div className="mt-1 text-lg font-semibold text-[#1c1917]">{participationBalance < 55 ? 'High' : participationBalance < 70 ? 'Medium' : 'Low'}</div>
                      <div className="text-xs text-[#4b463f]">{participationBalance < 55 ? 'Needs action' : 'Healthy'}</div>
                    </div>
                    <div className="rt-subpanel rounded-2xl p-3 text-center">
                      <div className="text-xs tracking-[0.14em] text-[#6b645c]">ENGAGEMENT</div>
                      <div className="mt-1 text-lg font-semibold text-[#1c1917]">{engagement.label}</div>
                      <div className="text-xs text-[#4b463f]">Active</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 rt-surface rt-gild rounded-3xl p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold tracking-tight text-[#1c1917]">Trends</div>
                  <div className="mt-1 text-xs text-[#4b463f]">Rolling 30 minutes and cumulative pace</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-xl border border-[#b9902e]/18 bg-white/60 px-3 py-2 text-xs text-[#1c1917]">
                    Msg/min <span className="font-semibold">{metrics.densityPerMin}</span>
                  </div>
                  <div className="rounded-xl border border-[#b9902e]/18 bg-white/60 px-3 py-2 text-xs text-[#1c1917]">
                    Avg response <span className="font-semibold">{metrics.avgResponseSec}s</span>
                  </div>
                  <div className="rounded-xl border border-[#b9902e]/18 bg-white/60 px-3 py-2 text-xs text-[#1c1917]">
                    Coverage <span className="font-semibold">{metrics.coveragePct}%</span>
                  </div>
                  <div className="rounded-xl border border-[#b9902e]/18 bg-white/60 px-3 py-2 text-xs text-[#1c1917]">
                    Coverage 10m <span className="font-semibold">{metrics.coverageRecentPct}%</span>
                  </div>
                  <div className="rounded-xl border border-[#b9902e]/18 bg-white/60 px-3 py-2 text-xs text-[#1c1917]">
                    Silence gaps <span className="font-semibold">{metrics.silenceSegments}</span>
                  </div>
                  {metrics.turnSeconds != null && metrics.turnRemainingSec != null ? (
                    <div className="rounded-xl border border-[#b9902e]/18 bg-white/60 px-3 py-2 text-xs text-[#1c1917]">
                      Turn <span className="font-semibold">{metrics.turnSeconds}s</span> ·{' '}
                      <span className="font-semibold">{metrics.turnRemainingSec}s</span> left
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-[#b9902e]/14 bg-white/55 p-4">
                  <div className="text-xs font-semibold tracking-[0.14em] text-[#7a5b10]">LAST 30 MINUTES</div>
                  <svg className="mt-3 h-28 w-full" viewBox="0 0 300 120" aria-label="Last 30 minutes trend">
                    {(() => {
                      const pts = trend30m.buckets.map((v, i) => {
                        const x = (i / 29) * 300
                        const y = 110 - (v / trend30m.max) * 90
                        return { x, y }
                      })
                      const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
                      const area = `${d} L 300 110 L 0 110 Z`
                      return (
                        <>
                          <path d={area} fill="rgba(185,144,46,0.16)" />
                          <path d={d} fill="none" stroke="rgba(185,144,46,0.75)" strokeWidth="2" strokeLinejoin="round" />
                        </>
                      )
                    })()}
                  </svg>
                  <div className="mt-2 flex items-center justify-between text-xs text-[#6b645c]">
                    <div>−30m</div>
                    <div>now</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#b9902e]/14 bg-white/55 p-4">
                  <div className="text-xs font-semibold tracking-[0.14em] text-[#7a5b10]">CUMULATIVE</div>
                  <svg className="mt-3 h-28 w-full" viewBox="0 0 300 120" aria-label="Cumulative trend">
                    {(() => {
                      const pts = trendCumulative.points.map((v, i) => {
                        const x = (i / 23) * 300
                        const y = 110 - (v / trendCumulative.max) * 90
                        return { x, y }
                      })
                      const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
                      return <path d={d} fill="none" stroke="rgba(28,25,23,0.55)" strokeWidth="2" strokeLinejoin="round" />
                    })()}
                  </svg>
                  <div className="mt-2 flex items-center justify-between text-xs text-[#6b645c]">
                    <div>start</div>
                    <div>{posts.length} posts</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rt-subpanel rounded-2xl p-3 text-center">
                  <div className="text-xs tracking-[0.14em] text-[#6b645c]">LIKES</div>
                  <div className="mt-1 text-lg font-semibold text-[#1c1917]">{metrics.totalLikes}</div>
                </div>
                <div className="rt-subpanel rounded-2xl p-3 text-center">
                  <div className="text-xs tracking-[0.14em] text-[#6b645c]">WORDS</div>
                  <div className="mt-1 text-lg font-semibold text-[#1c1917]">{metrics.totalWords}</div>
                </div>
                <div className="rt-subpanel rounded-2xl p-3 text-center">
                  <div className="text-xs tracking-[0.14em] text-[#6b645c]">ALERTS</div>
                  <div className="mt-1 text-lg font-semibold text-[#1c1917]">{alerts.length}</div>
                </div>
                <div className="rt-subpanel rounded-2xl p-3 text-center">
                  <div className="text-xs tracking-[0.14em] text-[#6b645c]">DRAFTING</div>
                  <div className="mt-1 text-lg font-semibold text-[#1c1917]">{draftingNow}</div>
                </div>
              </div>
            </div>

            <div className="mt-6 rt-surface rt-gild rounded-3xl p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold tracking-tight text-[#1c1917]">Contribution Heatmap</div>
                  <div className="mt-1 text-xs text-[#4b463f]">Last 7 days · 09:00–21:00</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-xl border border-[#b9902e]/18 bg-white/60 px-3 py-2 text-xs text-[#1c1917]">
                    Total: <span className="font-semibold">{hourHeatmap.total}</span>
                  </div>
                  <div className="rounded-xl border border-[#b9902e]/18 bg-white/60 px-3 py-2 text-xs text-[#1c1917]">
                    Peak: <span className="font-semibold">{String(hourHeatmap.peakHour).padStart(2, '0')}:00</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 overflow-x-auto">
                <div className="min-w-[680px]">
                  <div className="grid grid-cols-[110px_repeat(13,minmax(0,1fr))] items-center gap-2 text-xs text-[#6b645c]">
                    <div />
                    {Array.from({ length: 13 }, (_, i) => (
                      <div key={i} className="text-center">
                        {9 + i}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 grid gap-2">
                    {hourHeatmap.grid.map((row, rIdx) => {
                      const dayLabel = rIdx === hourHeatmap.grid.length - 1 ? 'Today' : `${hourHeatmap.grid.length - 1 - rIdx} days ago`
                      return (
                        <div key={dayLabel} className="grid grid-cols-[110px_repeat(13,minmax(0,1fr))] items-center gap-2">
                          <div className="text-xs text-[#6b645c]">{dayLabel}</div>
                          {row.map((c, cIdx) => {
                            const t = c / hourHeatmap.max
                            const bg = t === 0 ? 'rgba(28,25,23,0.08)' : `rgba(185,144,46,${0.18 + t * 0.55})`
                            const border = t === 0 ? 'rgba(185,144,46,0.12)' : 'rgba(185,144,46,0.28)'
                            return (
                              <div
                                key={`${rIdx}-${cIdx}`}
                                title={`${dayLabel} ${9 + cIdx}:00 · ${c} posts`}
                                className="h-7 rounded-md border shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]"
                                style={{ background: bg, borderColor: border }}
                              />
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-[#6b645c]">
                <div>Less</div>
                <div className="flex items-center gap-1">
                  {[0.08, 0.22, 0.36, 0.5, 0.64].map((a) => (
                    <div key={a} className="h-2.5 w-6 rounded-sm border border-[#b9902e]/18" style={{ background: `rgba(185,144,46,${a})` }} />
                  ))}
                </div>
                <div>More</div>
              </div>

              <div className="mt-6 border-t border-[#b9902e]/14 pt-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold tracking-tight text-[#1c1917]">Participant Breakdown</div>
                    <div className="mt-1 text-xs text-[#4b463f]">Last activity and contribution weight</div>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-xl border border-[#b9902e]/18 bg-white/60 px-3 py-2 text-xs font-semibold text-[#1c1917]">
                    <Sparkles className="h-4 w-4 text-[#6b645c]" />
                    Spark
                  </div>
                </div>

                <div className="mt-4">
                  {participantBreakdown.length === 0 ? (
                    <div className="text-sm text-[#4b463f]">No participants yet.</div>
                  ) : participantBreakdown.length > 50 ? (
                    <div className="rounded-2xl border border-[#b9902e]/14 bg-white/55">
                      <div className="flex items-center justify-between gap-4 border-b border-[#b9902e]/12 px-4 py-3 text-xs text-[#6b645c]">
                        <div>
                          Showing{' '}
                          <span className="font-semibold text-[#1c1917]">
                            {Math.min(participantBreakdown.length, Math.max(1, Math.floor(participantScrollTop / 64) + 1))}–
                            {Math.min(participantBreakdown.length, Math.floor((participantScrollTop + 520) / 64) + 8)}
                          </span>{' '}
                          of <span className="font-semibold text-[#1c1917]">{participantBreakdown.length}</span>
                        </div>
                        <div className="text-[#4b463f]">Virtualized</div>
                      </div>
                      {(() => {
                        const itemH = 64
                        const height = 520
                        const overscan = 6
                        const total = participantBreakdown.length
                        const { start, end } = computeVirtualRange({
                          scrollTop: participantScrollTop,
                          itemHeight: itemH,
                          viewportHeight: height,
                          overscan,
                          total,
                        })
                        const slice = participantBreakdown.slice(start, end)
                        return (
                          <div
                            className="relative h-[520px] overflow-auto"
                            onScroll={(e) => setParticipantScrollTop((e.currentTarget as HTMLDivElement).scrollTop)}
                          >
                            <div style={{ height: total * itemH }}>
                              {slice.map((p, idx) => {
                                const y = (start + idx) * itemH
                                return (
                                  <div key={p.label} className="absolute left-0 right-0 px-4" style={{ transform: `translateY(${y}px)` }}>
                                    <div className="flex h-[56px] items-center justify-between gap-4 rounded-2xl border border-[#b9902e]/14 bg-white/60 px-4">
                                      <div className="flex min-w-0 items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#b9902e]/18 bg-white/70 text-xs font-semibold text-[#7a5b10]">
                                          {initials(p.label)}
                                        </div>
                                        <div className="min-w-0">
                                          <div className="truncate text-sm font-semibold text-[#1c1917]">{p.label}</div>
                                          <div className="mt-0.5 text-xs text-[#4b463f]">Last: {formatAgo(nowMs - p.lastAt)}</div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <div className="text-right">
                                          <div className="text-sm font-semibold text-[#1c1917]">{p.count}</div>
                                          <div className="text-[11px] text-[#6b645c]">contributions</div>
                                        </div>
                                        <span
                                          className={[
                                            'rounded-lg px-2.5 py-1 text-[11px] font-semibold',
                                            p.tag === 'High'
                                              ? 'bg-emerald-500/12 text-emerald-800'
                                              : p.tag === 'Medium'
                                                ? 'bg-amber-500/16 text-amber-900'
                                                : 'bg-red-500/12 text-red-800',
                                          ].join(' ')}
                                        >
                                          {p.tag}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {participantBreakdown.map((p) => (
                        <div key={p.label} className="flex items-center justify-between gap-4 rounded-2xl border border-[#b9902e]/14 bg-white/55 px-4 py-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#b9902e]/18 bg-white/70 text-xs font-semibold text-[#7a5b10]">
                              {initials(p.label)}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-[#1c1917]">{p.label}</div>
                              <div className="mt-0.5 text-xs text-[#4b463f]">Last: {formatAgo(nowMs - p.lastAt)}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="text-sm font-semibold text-[#1c1917]">{p.count}</div>
                              <div className="text-[11px] text-[#6b645c]">contributions</div>
                            </div>
                            <span
                              className={[
                                'rounded-lg px-2.5 py-1 text-[11px] font-semibold',
                                p.tag === 'High'
                                  ? 'bg-emerald-500/12 text-emerald-800'
                                  : p.tag === 'Medium'
                                    ? 'bg-amber-500/16 text-amber-900'
                                    : 'bg-red-500/12 text-red-800',
                              ].join(' ')}
                            >
                              {p.tag}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="lg:col-span-5">
            <div className="rt-surface rt-gild rounded-3xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold tracking-tight text-[#1c1917]">Control Deck</div>
                  <div className="mt-1 text-xs text-[#4b463f]">Lightweight interventions, instant effect</div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#b9902e]/18 bg-white/60 px-3 py-1 text-xs text-[#1c1917]">
                  Room <span className="font-semibold">{roomId ?? '—'}</span>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-[#b9902e]/14 bg-white/55 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold tracking-[0.14em] text-[#7a5b10]">SPEAKING</div>
                      <div className="mt-1 text-sm font-semibold text-[#1c1917]">{control?.paused ? 'Paused' : 'Live'}</div>
                    </div>
                    <button
                      className={[
                        'rt-gild inline-flex h-10 items-center justify-center rounded-xl px-4 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35',
                        control?.paused ? 'bg-[#b9902e] text-black' : 'border border-[#b9902e]/18 bg-white/70 text-[#1c1917] hover:bg-white/85',
                      ].join(' ')}
                      type="button"
                      onClick={() => {
                        const nextPaused = !control?.paused
                        saveControl({ paused: nextPaused })
                        pushEvent({ id: createEventId(), at: Date.now(), actor, kind: nextPaused ? 'pause' : 'resume' })
                      }}
                      disabled={!roomId}
                    >
                      {control?.paused ? 'Resume' : 'Pause'}
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#b9902e]/14 bg-white/55 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold tracking-[0.14em] text-[#7a5b10]">TURN ROTATION</div>
                      <div className="mt-1 text-sm text-[#4b463f]">{room?.mode === 'structured' ? 'Advance the round-robin speaker.' : 'Available in Structured mode.'}</div>
                    </div>
                    <button
                      className="rt-gild inline-flex h-10 items-center justify-center rounded-xl bg-[#b9902e] px-4 text-xs font-semibold text-black transition hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35 disabled:opacity-50"
                      type="button"
                      onClick={onAdvanceTurn}
                      disabled={!roomId || room?.mode !== 'structured'}
                    >
                      Next Speaker
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#b9902e]/14 bg-white/55 p-4">
                  <div className="text-xs font-semibold tracking-[0.14em] text-[#7a5b10]">PROMPT CARD</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[
                      'Define the key term before debating it.',
                      'State one concrete example, then one counterexample.',
                      'Summarize the other side in one sentence before replying.',
                      'Name one assumption that could be wrong.',
                    ].map((t) => (
                      <button
                        key={t}
                        className="rt-gild inline-flex h-9 items-center justify-center rounded-xl border border-[#b9902e]/18 bg-white/70 px-3 text-xs font-semibold text-[#1c1917] transition hover:bg-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35"
                        type="button"
                        onClick={() => {
                          const now = Date.now()
                          saveControl({ promptCard: { id: `card-${now}`, text: t, createdAt: now } })
                          pushEvent({ id: createEventId(), at: now, actor, kind: 'prompt', text: t })
                        }}
                        disabled={!roomId}
                      >
                        {t.length > 28 ? `${t.slice(0, 28)}…` : t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#b9902e]/14 bg-white/55 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold tracking-[0.14em] text-[#7a5b10]">QUICK POLL</div>
                      <div className="mt-1 text-sm text-[#4b463f]">Broadcast a 3-option check-in.</div>
                    </div>
                    <button
                      className="rt-gild inline-flex h-10 items-center justify-center rounded-xl border border-[#b9902e]/18 bg-white/70 px-4 text-xs font-semibold text-[#1c1917] transition hover:bg-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35 disabled:opacity-50"
                      type="button"
                      onClick={() => {
                        if (!roomId) return
                        const now = Date.now()
                        const poll = {
                          id: `poll-${now}`,
                          question: 'Do we agree on the core claim?',
                          options: ['Agree', 'Disagree', 'Unsure'],
                          createdAt: now,
                        }
                        removeKey(facPollVotesKey(roomId, poll.id))
                        saveControl({ poll })
                        pushEvent({ id: createEventId(), at: now, actor, kind: 'poll-start', pollId: poll.id, question: poll.question, options: poll.options })
                      }}
                      disabled={!roomId}
                    >
                      Start Poll
                    </button>
                  </div>

                  {pollResults ? (
                    <div className="mt-4 grid gap-2">
                      <div className="text-sm font-semibold text-[#1c1917]">{pollResults.poll.question}</div>
                      {pollResults.poll.options.map((o) => {
                        const count = pollResults.counts[o] ?? 0
                        const pct = Math.round((count / pollResults.total) * 100)
                        return (
                          <div key={o} className="rounded-xl border border-[#b9902e]/14 bg-white/70 px-3 py-2">
                            <div className="flex items-center justify-between gap-3 text-xs">
                              <div className="font-semibold text-[#1c1917]">{o}</div>
                              <div className="text-[#4b463f]">
                                {count} · {pct}%
                              </div>
                            </div>
                            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#1c1917]/10">
                              <div className="h-full rounded-full bg-[#b9902e]" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-6 rt-surface rt-gild rounded-3xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold tracking-tight text-[#1c1917]">Fairness Rules</div>
                  <div className="mt-1 text-xs text-[#4b463f]">Saved per chamber, applied instantly</div>
                </div>
                <div className="rounded-full border border-[#b9902e]/18 bg-white/60 px-3 py-1 text-xs text-[#1c1917]">
                  Active
                </div>
              </div>

              <div className="mt-5 grid gap-4">
                <div className="rounded-2xl border border-[#b9902e]/14 bg-white/55 px-4 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm font-semibold text-[#1c1917]">Silence Threshold</div>
                    <div className="text-xs font-semibold text-[#4b463f]">{rules.silenceSeconds}s</div>
                  </div>
                  <input
                    aria-label="Silence Threshold"
                    className="mt-3 w-full accent-[#b9902e]"
                    type="range"
                    min={30}
                    max={600}
                    step={10}
                    value={rules.silenceSeconds}
                    onChange={(e) => saveRules({ silenceSeconds: Number(e.target.value) })}
                  />
                </div>

                <div className="rounded-2xl border border-[#b9902e]/14 bg-white/55 px-4 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm font-semibold text-[#1c1917]">Dominance Share</div>
                    <div className="text-xs font-semibold text-[#4b463f]">{rules.dominanceSharePct}%</div>
                  </div>
                  <input
                    aria-label="Dominance Share"
                    className="mt-3 w-full accent-[#b9902e]"
                    type="range"
                    min={20}
                    max={95}
                    step={1}
                    value={rules.dominanceSharePct}
                    onChange={(e) => saveRules({ dominanceSharePct: Number(e.target.value) })}
                  />
                </div>

                <div className="rounded-2xl border border-[#b9902e]/14 bg-white/55 px-4 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm font-semibold text-[#1c1917]">Consecutive Posts</div>
                    <div className="text-xs font-semibold text-[#4b463f]">{rules.consecutivePosts}</div>
                  </div>
                  <input
                    aria-label="Consecutive Posts"
                    className="mt-3 w-full accent-[#b9902e]"
                    type="range"
                    min={2}
                    max={8}
                    step={1}
                    value={rules.consecutivePosts}
                    onChange={(e) => saveRules({ consecutivePosts: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 rt-surface rt-gild rounded-3xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold tracking-tight text-[#1c1917]">Timeline</div>
                  <div className="mt-1 text-xs text-[#4b463f]">Rules and interventions</div>
                </div>
                <div className="rounded-full border border-[#b9902e]/18 bg-white/60 px-3 py-1 text-xs text-[#1c1917]">
                  Events <span className="font-semibold">{events.length}</span>
                </div>
              </div>

              <div className="mt-5 grid gap-2">
                {events.length === 0 ? (
                  <div className="rounded-2xl border border-[#b9902e]/14 bg-white/55 p-4 text-sm text-[#4b463f]">No events yet.</div>
                ) : (
                  [...events]
                    .slice(-12)
                    .reverse()
                    .map((e) => {
                      const detail = eventDetail(e)
                      return (
                        <div key={e.id} className="rounded-2xl border border-[#b9902e]/14 bg-white/55 px-4 py-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-[#1c1917]">{eventTitle(e)}</div>
                              {detail ? <div className="mt-1 line-clamp-2 text-xs text-[#4b463f]">{detail}</div> : null}
                            </div>
                            <div className="text-right text-xs text-[#6b645c]">
                              <div>{formatAgo(nowMs - e.at)}</div>
                              {e.actor ? <div className="mt-1 font-semibold text-[#1c1917]">{e.actor}</div> : null}
                            </div>
                          </div>
                        </div>
                      )
                    })
                )}
              </div>
            </div>

            <div className="rt-surface rt-gild rounded-3xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#b9902e]/20 bg-white/70 text-[#7a5b10]">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold tracking-tight text-[#1c1917]">Guardian Alerts</div>
                    <div className="mt-1 text-xs text-[#4b463f]">Discussion safety monitoring</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-full border border-[#b9902e]/18 bg-white/60 px-3 py-1 text-xs text-[#1c1917]">
                    Alerts <span className="font-semibold">{alerts.length}</span>
                  </div>
                  <button
                    className="rt-gild inline-flex h-9 items-center justify-center rounded-xl border border-[#b9902e]/18 bg-white/70 px-3 text-xs font-semibold text-[#1c1917] transition hover:bg-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35"
                    type="button"
                    onClick={() => setMutedAlerts((v) => !v)}
                  >
                    {mutedAlerts ? 'Unmute' : 'Mute'}
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                {alerts.length === 0 ? (
                  <div className="rounded-2xl border border-[#b9902e]/14 bg-white/55 p-4 text-sm text-[#4b463f]">No alerts. The chamber appears stable.</div>
                ) : (
                  alerts.map((a) => {
                    const expanded = !!alertExpanded[a.id]
                    const explain = alertExplains[a.id]
                    const severityTone =
                      a.severity === 'critical'
                        ? 'border-red-500/30 bg-red-500/10'
                        : a.severity === 'warning'
                          ? 'border-amber-500/30 bg-amber-500/10'
                          : 'border-emerald-500/26 bg-emerald-500/8'
                    const badgeTone =
                      a.severity === 'critical'
                        ? 'bg-red-500/18 text-red-900'
                        : a.severity === 'warning'
                          ? 'bg-amber-500/20 text-amber-950'
                          : 'bg-emerald-500/14 text-emerald-900'
                    return (
                      <div key={a.id} className={['rounded-2xl border p-4', severityTone].join(' ')}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="truncate text-sm font-semibold text-[#1c1917]">{a.title}</div>
                              <span className={['rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-[0.14em]', badgeTone].join(' ')}>
                                {a.severity.toUpperCase()}
                              </span>
                            </div>
                            <div className="mt-2 text-xs leading-6 text-[#4b463f]">{a.detail}</div>
                            {a.involved.length ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {a.involved.map((x) => (
                                  <span key={x} className="rounded-full border border-[#b9902e]/18 bg-white/60 px-3 py-1 text-[11px] font-semibold text-[#1c1917]">
                                    {x}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              className="rt-gild inline-flex h-9 items-center justify-center rounded-xl border border-[#b9902e]/18 bg-white/70 px-3 text-xs font-semibold text-[#1c1917] transition hover:bg-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35"
                              type="button"
                              onClick={async () => {
                                if (!roomId) return
                                const res = await ai.explainAlert({
                                  alertTitle: a.title,
                                  alertDetail: a.detail,
                                  context: { roomId, roomTitle: room?.title, prompt: room?.prompt, topic: room?.topic, mode: room?.mode },
                                })
                                setAlertExplains((prev) => ({ ...prev, [a.id]: res }))
                                setAlertExpanded((prev) => ({ ...prev, [a.id]: true }))
                              }}
                            >
                              Spark
                            </button>
                            <button
                              aria-label="Dismiss"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#b9902e]/18 bg-white/70 text-[#1c1917] transition hover:bg-white/85"
                              type="button"
                              onClick={() => setDismissedAlerts((prev) => ({ ...prev, [a.id]: true }))}
                            >
                              <span className="text-lg leading-none">×</span>
                            </button>
                            <button
                              aria-label={expanded ? 'Collapse' : 'Expand'}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#b9902e]/18 bg-white/70 text-[#1c1917] transition hover:bg-white/85"
                              type="button"
                              onClick={() => setAlertExpanded((prev) => ({ ...prev, [a.id]: !prev[a.id] }))}
                            >
                              <ChevronDown className={['h-4 w-4 transition-transform', expanded ? 'rotate-180' : ''].join(' ')} />
                            </button>
                          </div>
                        </div>

                        {expanded ? (
                          <div className="mt-4 rounded-2xl border border-[#b9902e]/14 bg-white/55 p-4">
                            {explain ? (
                              <>
                                <div className="text-xs font-semibold tracking-[0.14em] text-[#7a5b10]">AI CONTEXT</div>
                                <div className="mt-2 text-sm leading-7 text-[#1c1917]">{explain.explanation}</div>
                                {explain.evidence.length ? (
                                  <div className="mt-3 grid gap-2">
                                    {explain.evidence.map((e) => (
                                      <div key={e} className="rounded-xl border border-[#b9902e]/14 bg-white/65 px-3 py-2 text-xs text-[#4b463f]">
                                        {e}
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                              </>
                            ) : (
                              <div className="text-sm text-[#4b463f]">Expand to view details.</div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div className="mt-6 rt-surface rt-gild rounded-3xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold tracking-tight text-[#1c1917]">Near Contributions</div>
                  <div className="mt-1 text-xs text-[#4b463f]">Drafts typed in Thought Space but not posted yet.</div>
                </div>
                <div className="rounded-full border border-[#b9902e]/18 bg-white/60 px-3 py-1 text-xs text-[#1c1917]">
                  {draftingNow} drafting now
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                {nearContributions.length === 0 ? (
                  <div className="text-sm text-[#4b463f]">No drafts detected.</div>
                ) : (
                  nearContributions.map((d) => (
                    <div key={d.id} className="rounded-2xl border border-[#b9902e]/14 bg-white/55 p-4">
                      <div className="text-xs text-[#6b645c]">{nowMs - d.lastActivityAt < 30_000 ? 'Drafting now' : 'Draft saved'}</div>
                      <div className="mt-2 text-sm leading-7 text-[#1c1917]">{d.text}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          className="rt-gild inline-flex h-9 items-center justify-center rounded-xl border border-[#b9902e]/18 bg-white/70 px-3 text-xs font-semibold text-[#1c1917] transition hover:bg-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35"
                          type="button"
                          onClick={async () => {
                            const res = await ai.weaveContribution({
                              contribution: d.text,
                              context: { roomId: room?.id, roomTitle: room?.title, prompt: room?.prompt, topic: room?.topic, mode: room?.mode },
                            })
                            setWeaves((prev) => ({ ...prev, [d.id]: res }))
                          }}
                        >
                          Weave with AI
                        </button>
                        <button
                          className="rt-gild inline-flex h-9 items-center justify-center rounded-xl border border-[#b9902e]/18 bg-white/70 px-3 text-xs font-semibold text-[#1c1917] transition hover:bg-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35"
                          type="button"
                          onClick={() => onMakeSpeaker(d.seatId)}
                        >
                          Make Speaker
                        </button>
                      </div>
                      {weaves[d.id] ? (
                        <div className="mt-3 rounded-2xl border border-[#b9902e]/18 bg-white/65 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-xs font-semibold tracking-[0.14em] text-[#7a5b10]">WEAVING SCRIPT</div>
                            <button
                              className="rt-gild inline-flex h-8 items-center justify-center rounded-lg border border-[#b9902e]/18 bg-white/70 px-3 text-[11px] font-semibold text-[#1c1917] transition hover:bg-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35"
                              type="button"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(weaves[d.id]!.script)
                                } catch {}
                              }}
                            >
                              Copy
                            </button>
                          </div>
                          <div className="mt-2 text-sm leading-7 text-[#1c1917]">{weaves[d.id]!.script}</div>
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-6 rt-surface rt-gild rounded-3xl p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#b9902e]/20 bg-white/70 text-[#7a5b10]">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold tracking-tight text-[#1c1917]">AI Equitable Participation Report</div>
                    <div className="mt-1 text-xs text-[#4b463f]">Last updated: {formatAgo(nowMs - reportUpdatedAt)}</div>
                  </div>
                </div>
                <button
                  className="rt-gild inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#b9902e]/18 bg-white/70 px-4 text-xs font-semibold text-[#1c1917] transition hover:bg-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35"
                  type="button"
                  onClick={() => {
                    if (roomId) localStorage.setItem(`rt:fac-report:${roomId}`, String(clamp(participationBalance, 0, 99)))
                    setReportUpdatedAt(Date.now())
                  }}
                >
                  <RefreshCw className="h-4 w-4" />
                  Regenerate report
                </button>
              </div>

              <div className="mt-4 rounded-3xl border border-[#b9902e]/14 bg-white/55 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#b9902e]/24 bg-white/70 text-lg font-semibold text-[#1c1917]">
                      {report.score}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#1c1917]">Overall Participation Score</div>
                      <div className="mt-1 text-xs text-[#4b463f]">Based on distribution, response rates, and engagement quality</div>
                      {report.delta != null ? (
                        <div className="mt-1 text-xs text-[#4b463f]">
                          {report.delta >= 0 ? '+' : ''}
                          {report.delta}% from last session
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-xl border border-[#b9902e]/18 bg-white/70 px-3 py-2 text-xs font-semibold text-[#1c1917]">
                    <Sparkles className="h-4 w-4 text-[#6b645c]" />
                    Spark
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-[#b9902e]/14 bg-white/60">
                  <button
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                    type="button"
                    onClick={() => setReportOpen((prev) => ({ ...prev, distribution: !prev.distribution }))}
                  >
                    <div className="text-sm font-semibold text-[#1c1917]">Speaking Time Distribution</div>
                    <div className="inline-flex items-center gap-2 text-xs text-[#4b463f]">
                      {participationBalance}% balanced
                      <ChevronDown className={['h-4 w-4 transition-transform', reportOpen.distribution ? 'rotate-180' : ''].join(' ')} />
                    </div>
                  </button>

                  {reportOpen.distribution ? (
                    <div className="grid gap-3 border-t border-[#b9902e]/12 p-4 sm:grid-cols-2">
                      <div className="rt-subpanel rounded-2xl p-4">
                        <div className="text-xs tracking-[0.14em] text-[#6b645c]">AVG RESPONSE</div>
                        <div className="mt-2 text-xl font-semibold text-[#1c1917]">{Math.max(12, Math.round((silenceSeconds % 60) + 18))} seconds</div>
                      </div>
                      <div className="rt-subpanel rounded-2xl p-4">
                        <div className="text-xs tracking-[0.14em] text-[#6b645c]">CONTRIBUTIONS</div>
                        <div className="mt-2 text-xl font-semibold text-[#1c1917]">{posts.length}</div>
                      </div>
                      <div className="rt-subpanel rounded-2xl p-4">
                        <div className="text-xs tracking-[0.14em] text-[#6b645c]">CROSS-REFERENCES</div>
                        <div className="mt-2 text-xl font-semibold text-[#1c1917]">{Math.min(posts.length, Math.max(0, Math.round(posts.length / 3)))}</div>
                      </div>
                      <div className="rt-subpanel rounded-2xl p-4">
                        <div className="text-xs tracking-[0.14em] text-[#6b645c]">CONSTRUCTIVE RATE</div>
                        <div className="mt-2 text-xl font-semibold text-[#1c1917]">{clamp(70 + Math.round(avgImpact / 2), 0, 99)}%</div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="mt-3 rounded-2xl border border-[#b9902e]/14 bg-white/60">
                  <button
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                    type="button"
                    onClick={() => setReportOpen((prev) => ({ ...prev, recommendations: !prev.recommendations }))}
                  >
                    <div className="text-sm font-semibold text-[#1c1917]">Facilitator Recommendations</div>
                    <ChevronDown className={['h-4 w-4 transition-transform', reportOpen.recommendations ? 'rotate-180' : ''].join(' ')} />
                  </button>
                  {reportOpen.recommendations ? (
                    <div className="border-t border-[#b9902e]/12 p-4">
                      <div className="grid gap-2">
                        {report.recommendations.map((x) => (
                          <div key={x} className="rounded-xl border border-[#b9902e]/14 bg-white/70 px-3 py-2 text-sm text-[#1c1917]">
                            {x}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="mt-3 rounded-2xl border border-[#b9902e]/14 bg-white/60">
                  <button
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                    type="button"
                    onClick={() => setReportOpen((prev) => ({ ...prev, highlights: !prev.highlights }))}
                  >
                    <div className="text-sm font-semibold text-[#1c1917]">Session Highlights</div>
                    <ChevronDown className={['h-4 w-4 transition-transform', reportOpen.highlights ? 'rotate-180' : ''].join(' ')} />
                  </button>
                  {reportOpen.highlights ? (
                    <div className="border-t border-[#b9902e]/12 p-4">
                      {report.highlights.length === 0 ? (
                        <div className="text-sm text-[#4b463f]">No highlights yet.</div>
                      ) : (
                        <div className="grid gap-2">
                          {report.highlights.map((x) => (
                            <div key={x} className="rounded-xl border border-[#b9902e]/14 bg-white/70 px-3 py-2 text-sm text-[#1c1917]">
                              {x}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {room?.mode === 'structured' ? (
              <div className="mt-6 rt-surface rt-gild rounded-3xl p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold tracking-tight text-[#1c1917]">Round-robin Control</div>
                    <div className="mt-1 text-xs text-[#4b463f]">
                      Current speaker:{' '}
                      <span className="font-semibold text-[#1c1917]">{session?.order.find((p) => p.id === session.currentSpeakerId)?.label ?? '—'}</span>
                    </div>
                  </div>
                  <button
                    className="rt-gild inline-flex h-10 items-center justify-center rounded-xl bg-[#b9902e] px-4 text-xs font-semibold text-black transition hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35 disabled:opacity-50"
                    type="button"
                    onClick={onAdvanceTurn}
                    disabled={!session}
                  >
                    Advance Turn
                  </button>
                </div>

                {session ? (
                  <div className="mt-4 grid gap-2">
                    {session.order.map((p, idx) => {
                      const stat = session.stats[p.id] ?? { speeches: 0, seconds: 0 }
                      const isCurrent = p.id === session.currentSpeakerId
                      return (
                        <div
                          key={p.id}
                          className={[
                            'rounded-2xl border px-4 py-3',
                            isCurrent ? 'border-[#b9902e]/30 bg-white/70' : 'border-[#b9902e]/14 bg-white/55',
                          ].join(' ')}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-[#1c1917]">{p.label}</div>
                              <div className="mt-1 text-xs text-[#4b463f]">
                                {stat.speeches}/{session.maxSpeeches} speeches · {stat.seconds}/{session.maxSeconds}s
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                className="rt-gild inline-flex h-9 items-center justify-center rounded-xl border border-[#b9902e]/18 bg-white/70 px-3 text-xs font-semibold text-[#1c1917] transition hover:bg-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35"
                                type="button"
                                onClick={() => onMakeSpeaker(p.id)}
                              >
                                Make Speaker
                              </button>
                              <button
                                aria-label="Move Up"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#b9902e]/18 bg-white/70 text-[#1c1917] transition hover:bg-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35 disabled:opacity-40"
                                type="button"
                                onClick={() => onMove(p.id, -1)}
                                disabled={idx === 0}
                              >
                                <ChevronUp className="h-4 w-4" />
                              </button>
                              <button
                                aria-label="Move Down"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#b9902e]/18 bg-white/70 text-[#1c1917] transition hover:bg-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35 disabled:opacity-40"
                                type="button"
                                onClick={() => onMove(p.id, 1)}
                                disabled={idx === session.order.length - 1}
                              >
                                <ChevronDown className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="mt-4 text-sm text-[#4b463f]">No session yet.</div>
                )}
              </div>
            ) : null}
          </section>
        </div>
      </div>

      <AppNavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </main>
  )
}
