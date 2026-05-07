import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Clock3, Heart, Menu, Send, Shield, Sparkles, Users } from 'lucide-react'

import { createLocalRoomRepository, type Room as RoomType } from '@/repositories/roomRepository'
import { createLocalPostRepository, type Post } from '@/repositories/postRepository'
import { createLocalSeatRepository, type Seat } from '@/repositories/seatRepository'
import { createLocalSessionRepository, type StructuredSession } from '@/repositories/sessionRepository'
import { createLocalDraftRepository } from '@/repositories/draftRepository'
import AiGuardianPanel from '@/components/AiGuardianPanel'
import ClaimSeatModal from '@/components/ClaimSeatModal'
import ConfirmDialog from '@/components/ConfirmDialog'
import AppNavDrawer from '@/components/AppNavDrawer'
import { computeKeywords, highlightTextParts } from '@/lib/guardian'
import { getJson, setJson, subscribeKey } from '@/lib/localStore'
import { facControlKey, facPollVotesKey, postsKey, sessionKey } from '@/lib/storageKeys'
import { createAiClient } from '@/services/aiClient'
import CrestSeal from '@/components/CrestSeal'

export default function Room() {
  const { roomId } = useParams()
  const repo = useMemo(() => createLocalRoomRepository(), [])
  const [room, setRoom] = useState<RoomType | null>(null)
  const [roomNotFound, setRoomNotFound] = useState(false)
  const postRepo = useMemo(() => createLocalPostRepository(), [])
  const seatRepo = useMemo(() => createLocalSeatRepository(), [])
  const sessionRepo = useMemo(() => createLocalSessionRepository(), [])
  const draftRepo = useMemo(() => createLocalDraftRepository(), [])
  const ai = useMemo(() => {
    const baseUrl = import.meta.env.VITE_AI_BASE_URL ? String(import.meta.env.VITE_AI_BASE_URL) : ''
    return createAiClient({ mode: baseUrl ? 'http' : 'stub', baseUrl })
  }, [])
  const [seat, setSeat] = useState<Seat | null>(null)
  const [session, setSession] = useState<StructuredSession | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [posts, setPosts] = useState<Post[]>([])
  const [now, setNow] = useState(() => Date.now())
  const [quotaError, setQuotaError] = useState<string | null>(null)
  const [privateDraft, setPrivateDraft] = useState('')
  const [privateDraftId, setPrivateDraftId] = useState<string | null>(null)
  const [draftHelpVisible, setDraftHelpVisible] = useState(false)
  const [draftAiBusy, setDraftAiBusy] = useState(false)
  const [draftAiRewrite, setDraftAiRewrite] = useState<string | null>(null)
  const [draftAiBullets, setDraftAiBullets] = useState<string[]>([])
  const [confirmPublishOpen, setConfirmPublishOpen] = useState(false)
  const [showAllMessages, setShowAllMessages] = useState(false)
  const [confirmAdvanceOpen, setConfirmAdvanceOpen] = useState(false)
  const [advanceUndoSpeakerId, setAdvanceUndoSpeakerId] = useState<string | null>(null)
  const [advanceBanner, setAdvanceBanner] = useState<string | null>(null)
  const [facControl, setFacControl] = useState<{
    paused?: boolean
    promptCard?: { id: string; text: string; createdAt: number }
    poll?: { id: string; question: string; options: string[]; createdAt: number }
  } | null>(null)
  const [pollVote, setPollVote] = useState<string | null>(null)
  const lastAiTurnKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (!roomId) return
    let cancelled = false
    setRoomNotFound(false)
    repo.getRoom(roomId).then((r) => {
      if (cancelled) return
      if (!r) setRoomNotFound(true)
      setRoom(r)
    })
    return () => { cancelled = true }
  }, [repo, roomId])

  useEffect(() => {
    if (!roomId) return
    const key = facControlKey(roomId)
    setFacControl((getJson(key) as typeof facControl) ?? null)
    return subscribeKey(key, (value) => setFacControl((value as typeof facControl) ?? null))
  }, [roomId])

  useEffect(() => {
    if (!roomId) return
    if (!seat) return
    const poll = facControl?.poll
    if (!poll) {
      setPollVote(null)
      return
    }
    const key = facPollVotesKey(roomId, poll.id)
    const read = (value: unknown | null) => {
      const votes = (value as Record<string, string> | null) ?? null
      setPollVote(votes?.[seat.id] ?? null)
    }
    read(getJson(key))
    return subscribeKey(key, read)
  }, [facControl?.poll, roomId, seat])

  useEffect(() => {
    if (!roomId) return
    const load = () => postRepo.listPosts(roomId).then(setPosts)
    load()
    return subscribeKey(postsKey(roomId), () => load())
  }, [postRepo, roomId])

  useEffect(() => {
    if (!roomId) return
    let cancelled = false
    seatRepo.getSeat(roomId).then((s) => {
      if (cancelled) return
      setSeat(s)
    })
    return () => { cancelled = true }
  }, [roomId, seatRepo])

  useEffect(() => {
    if (!roomId) return
    if (!seat) return
    let cancelled = false
    draftRepo.listDrafts(roomId).then((ds) => {
      if (cancelled) return
      const mine = ds.find((d) => d.seatId === seat.id && d.status === 'draft')
      setPrivateDraft(mine?.text ?? '')
      setPrivateDraftId(mine?.id ?? null)
    })
    return () => { cancelled = true }
  }, [draftRepo, roomId, seat])

  useEffect(() => {
    if (!roomId) return
    if (!seat) return
    const text = privateDraft
    const t = window.setTimeout(async () => {
      const saved = await draftRepo.upsertDraft({ roomId, seatId: seat.id, text })
      setPrivateDraftId(saved.id)
    }, 300)
    return () => window.clearTimeout(t)
  }, [draftRepo, privateDraft, roomId, seat])

  useEffect(() => {
    if (!seat) return
    if (privateDraft.trim().length < 30) {
      setDraftHelpVisible(false)
      return
    }
    const t = window.setTimeout(() => setDraftHelpVisible(true), 9000)
    return () => window.clearTimeout(t)
  }, [privateDraft, seat])

  useEffect(() => {
    if (!roomId) return
    if (!room) return
    if (!seat) return
    if (room.mode !== 'structured') return
    const target = Math.max(2, Math.min(room.capacity, room.participants || 2))
    sessionRepo.ensureSession(roomId, seat, { targetParticipants: target }).then(setSession)
  }, [room, roomId, seat, sessionRepo])

  useEffect(() => {
    if (!roomId) return
    if (!room) return
    if (room.mode !== 'structured') return
    const load = async () => setSession(await sessionRepo.getSession(roomId))
    load()
    return subscribeKey(sessionKey(roomId), () => load())
  }, [room, roomId, sessionRepo])

  useEffect(() => {
    if (!session) return
    const t = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(t)
  }, [session])

  const isStructured = room?.mode === 'structured'
  const seatStats = seat && session ? session.stats[seat.id] : null
  const quotaSpeechesRemaining = seat && session ? Math.max(0, session.maxSpeeches - (seatStats?.speeches ?? 0)) : 0
  const quotaSecondsRemaining = seat && session ? Math.max(0, session.maxSeconds - (seatStats?.seconds ?? 0)) : 0
  const isOverQuota = !!(seat && session && (quotaSpeechesRemaining <= 0 || quotaSecondsRemaining <= 0))

  const canSpeak = !isStructured || (seat && session && session.currentSpeakerId === seat.id && !isOverQuota)
  const paused = !!facControl?.paused
  const canSpeakNow = canSpeak && !paused
  const currentSpeaker = isStructured && session ? session.order.find((p) => p.id === session.currentSpeakerId) ?? null : null
  const turnRemainingSeconds =
    isStructured && session ? Math.min(session.turnSeconds, Math.max(0, Math.ceil((session.turnEndsAt - now) / 1000))) : 0
  const guardianKeywords = useMemo(() => (room?.aiGuardEnabled ? computeKeywords(posts) : []), [posts, room?.aiGuardEnabled])
  const maxVisible = 30
  const visiblePosts = useMemo(() => (showAllMessages ? posts : posts.slice(0, maxVisible)), [maxVisible, posts, showAllMessages])

  useEffect(() => {
    if (!roomId) return
    if (!isStructured) return
    if (!session) return
    if (turnRemainingSeconds > 0) return
    sessionRepo.advanceTurn(roomId).then(setSession)
  }, [isStructured, roomId, session, sessionRepo, turnRemainingSeconds])

  useEffect(() => {
    if (!roomId) return
    if (!room) return
    if (!isStructured) return
    if (!session) return
    if (!currentSpeaker?.isBot) return
    if (turnRemainingSeconds <= 0) return

    const aiTurnKey = `${session.currentSpeakerId}:${session.turnEndsAt}`
    if (lastAiTurnKeyRef.current === aiTurnKey) return
    lastAiTurnKeyRef.current = aiTurnKey

    const run = async () => {
      await new Promise((r) => window.setTimeout(r, 600))
      const recentMessages = posts
        .slice(0, 8)
        .reverse()
        .map((p) => `${p.authorLabel}: ${p.content}`)
        .join('\n')
      const contribution = [
        room.topic ? `Topic: ${room.topic}` : null,
        room.prompt ? `Prompt: ${room.prompt}` : null,
        `Recent messages:\n${recentMessages || 'No messages yet.'}`,
      ]
        .filter((v) => !!v)
        .join('\n\n')

      const res = await ai.weaveContribution({
        contribution,
        context: {
          roomId,
          roomTitle: room.title,
          prompt: room.prompt,
          topic: room.topic,
          mode: room.mode,
          security: room.security,
          shieldStrength: room.shieldStrength,
        },
      })

      await postRepo.createPost(roomId, {
        authorId: session.currentSpeakerId,
        authorLabel: currentSpeaker.label,
        content: res.script,
      })
      setPosts(await postRepo.listPosts(roomId))
      setSession(await sessionRepo.advanceTurn(roomId))
    }

    run()
  }, [ai, currentSpeaker, isStructured, postRepo, posts, room, roomId, session, sessionRepo, turnRemainingSeconds])

  async function onPublish() {
    if (!roomId) return
    if (!seat) return
    if (!canSpeakNow) return
    const trimmed = draft.trim()
    if (!trimmed) return
    setQuotaError(null)

    await postRepo.createPost(roomId, {
      authorId: seat.id,
      authorLabel: seat.isAnonymous ? 'Anonymous Knight' : seat.displayName,
      content: trimmed,
    })
    setDraft('')
    setPosts(await postRepo.listPosts(roomId))

    if (isStructured && session) {
      const remaining = Math.max(0, Math.ceil((session.turnEndsAt - Date.now()) / 1000))
      const used = Math.max(0, Math.min(session.turnSeconds, session.turnSeconds - remaining))
      try {
        setSession(await sessionRepo.recordSpeech(roomId, seat.id, used))
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Quota exceeded'
        setQuotaError(msg)
      }
    }

    if (isStructured) {
      setSession(await sessionRepo.advanceTurn(roomId))
    }
  }

  async function onPublishFromDraft() {
    setConfirmPublishOpen(true)
  }

  async function onConfirmPublishFromDraft() {
    if (!roomId) return
    if (!seat) return
    if (paused) return
    const trimmed = privateDraft.trim()
    if (!trimmed) return
    await postRepo.createPost(roomId, {
      authorId: seat.id,
      authorLabel: seat.isAnonymous ? 'Anonymous Knight' : seat.displayName,
      content: trimmed,
    })
    setPrivateDraft('')
    setDraftAiRewrite(null)
    setDraftAiBullets([])
    setPosts(await postRepo.listPosts(roomId))
    if (privateDraftId) await draftRepo.markPublished(privateDraftId)
  }

  async function onPolishDraft() {
    if (!seat) return
    if (!roomId) return
    setDraftAiBusy(true)
    try {
      const res = await ai.rewriteDraft({
        text: privateDraft,
        context: {
          roomId,
          roomTitle: room?.title,
          prompt: room?.prompt,
          topic: room?.topic,
          mode: room?.mode,
          security: room?.security,
          shieldStrength: room?.shieldStrength,
        },
      })
      setDraftAiRewrite(res.rewrite)
      setDraftAiBullets(res.bulletPoints)
    } finally {
      setDraftAiBusy(false)
    }
  }

  async function onLike(postId: string) {
    if (!roomId) return
    await postRepo.likePost(postId)
    setPosts(await postRepo.listPosts(roomId))
  }

  async function onSeatClaimed() {
    if (!roomId) return
    const nextSeat = await seatRepo.getSeat(roomId)
    setSeat(nextSeat)
    setRoom(await repo.getRoom(roomId))
  }

  async function onReleaseSeat() {
    if (!roomId) return
    await seatRepo.releaseSeat(roomId)
    setSeat(null)
    setRoom(await repo.getRoom(roomId))
    setDrawerOpen(false)
  }

  async function onAdvanceTurn() {
    setConfirmAdvanceOpen(true)
  }

  async function onConfirmAdvanceTurn() {
    if (!roomId) return
    if (!session) return
    const prevSpeakerId = session.currentSpeakerId
    setSession(await sessionRepo.advanceTurn(roomId))
    setAdvanceUndoSpeakerId(prevSpeakerId)
    setAdvanceBanner('Turn advanced.')
    window.setTimeout(() => {
      setAdvanceUndoSpeakerId(null)
      setAdvanceBanner(null)
    }, 6000)
  }

  const inviteCode = room?.facilitatorCode ?? ''

  return (
    <main className="relative z-10 min-h-dvh bg-transparent font-body text-[#1c1917] rt-page">
      <ConfirmDialog
        open={confirmPublishOpen}
        title="Confirm publish"
        description="Publish your private draft to the Round Table?"
        confirmLabel="Publish"
        cancelLabel="Cancel"
        onCancel={() => setConfirmPublishOpen(false)}
        onConfirm={async () => {
          setConfirmPublishOpen(false)
          await onConfirmPublishFromDraft()
        }}
      />
      <ConfirmDialog
        open={confirmAdvanceOpen}
        title="Confirm advance turn"
        description="Move to the next speaker?"
        confirmLabel="Advance"
        cancelLabel="Cancel"
        onCancel={() => setConfirmAdvanceOpen(false)}
        onConfirm={async () => {
          setConfirmAdvanceOpen(false)
          await onConfirmAdvanceTurn()
        }}
      />
      {roomId && room && !seat ? <ClaimSeatModal room={room} onClaimed={onSeatClaimed} /> : null}
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-6 focus:top-6 focus:z-50 focus:rounded-xl focus:bg-[#d7b25a] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-black"
        href="#main"
      >
        Skip to content
      </a>
      <div className="mx-auto max-w-5xl px-6 py-10" id="main">
        {roomNotFound ? (
          <div className="rt-surface rt-gild rounded-3xl p-12 text-center">
            <div className="text-2xl font-semibold text-[#1c1917]">Chamber Not Found</div>
            <div className="mt-3 text-sm text-[#4b463f]">
              This chamber does not exist or may have been removed.
            </div>
            <Link
              className="rt-gild mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#b9902e] px-6 text-sm font-semibold text-black transition hover:translate-y-[-1px]"
              to="/"
            >
              Return to Hall
            </Link>
          </div>
        ) : (
          <>
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="relative">
              <CrestSeal className="pointer-events-none absolute -left-6 -top-6 h-20 w-20 opacity-35 rt-rotate-slow" />
            </div>
            <Link
              aria-label="Back"
              className="mt-1 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#b9902e]/25 bg-white/55 text-[#1c1917] transition hover:bg-white/70"
              to="/"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{room?.title ?? 'The Round Table'}</h1>
              <div className="mt-1 text-sm text-[#4b463f]">{room?.topic ?? ''}</div>
              <div className="mt-3 flex flex-nowrap gap-2 overflow-x-auto pb-1" data-testid="room-tags">
                {(room?.tags ?? []).slice(0, 6).map((t) => (
                  <span key={t} className="flex-none whitespace-nowrap rounded-full border border-[#b9902e]/18 bg-white/55 px-3 py-1 text-xs text-[#4b463f]">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {room ? (
              <div className="inline-flex items-center gap-2 rounded-xl border border-[#b9902e]/20 bg-white/60 px-3 py-2 text-xs font-semibold text-[#1c1917]">
                <Shield className="h-4 w-4 text-[#7a5b10]" />
                {room.security === 'fortified' ? 'Fortified' : room.security === 'guarded' ? 'Guarded' : 'Open'}
              </div>
            ) : null}
            {room ? (
              <div className="inline-flex items-center gap-2 rounded-xl border border-[#b9902e]/20 bg-white/60 px-3 py-2 text-xs font-semibold text-[#1c1917]">
                <Users className="h-4 w-4 text-[#6b645c]" />
                {room.participants}/{room.capacity}
              </div>
            ) : null}
            {room?.aiGuardEnabled ? (
              <div className="inline-flex items-center gap-2 rounded-xl border border-violet-600/28 bg-violet-200/70 px-3 py-2 text-xs font-semibold text-violet-900">
                <Sparkles className="h-4 w-4" />
                AI Active
              </div>
            ) : null}
            <button
              aria-label="Menu"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#b9902e]/25 bg-white/55 text-[#1c1917] transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35"
              type="button"
              onClick={() => setDrawerOpen((v) => !v)}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="rounded-2xl border border-[#b9902e]/18 bg-white/55 px-4 py-2 text-xs font-semibold tracking-[0.18em] text-[#7a5b10]">
            INVITE CODE
          </div>
          <div className="rt-gild rounded-2xl border border-[#b9902e]/22 bg-white/70 px-5 py-2 font-mono text-sm font-semibold tracking-[0.4em] text-[#1c1917]">
            {inviteCode || '—'}
          </div>
        </div>

        <div className="mt-6 rt-surface rt-gild rounded-3xl p-6">
          <div className="text-xs tracking-[0.22em] text-[#f0d38a]">PROMPT</div>
          <div className="mt-3 text-sm leading-7 text-[#1c1917]">{room?.prompt ?? ''}</div>
        </div>

        {isStructured ? (
          <div className="mt-6 rt-surface rt-gild rounded-3xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold tracking-[0.18em] text-[#7a5b10]">STRUCTURED ORDER</div>
                <div className="mt-2 text-sm text-[#3f3a34]">
                  Current speaker:{' '}
                  <span className="font-semibold text-[#1c1917]">{currentSpeaker?.label ?? '—'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-xl border border-[#b9902e]/20 bg-white/60 px-3 py-2 text-xs font-semibold text-[#1c1917]">
                  <Clock3 className="h-4 w-4 text-[#6b645c]" />
                  {turnRemainingSeconds}s
                </div>
                <button
                  className="rt-gild inline-flex h-10 items-center justify-center rounded-xl border border-[#b9902e]/20 bg-white/60 px-4 text-xs font-semibold text-[#1c1917] transition hover:bg-white/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35"
                  type="button"
                  onClick={onAdvanceTurn}
                >
                  Advance Turn
                </button>
              </div>
            </div>

            {advanceBanner ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#b9902e]/18 bg-white/60 px-4 py-3">
                <div className="text-sm text-[#1c1917]">{advanceBanner}</div>
                {advanceUndoSpeakerId ? (
                  <button
                    className="rt-gild inline-flex h-9 items-center justify-center rounded-xl border border-[#b9902e]/18 bg-white/70 px-3 text-xs font-semibold text-[#1c1917] transition hover:bg-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35"
                    type="button"
                    onClick={async () => {
                      if (!roomId) return
                      if (!advanceUndoSpeakerId) return
                      setSession(await sessionRepo.setCurrentSpeaker(roomId, advanceUndoSpeakerId))
                      setAdvanceUndoSpeakerId(null)
                      setAdvanceBanner(null)
                    }}
                  >
                    Undo
                  </button>
                ) : null}
              </div>
            ) : null}

            {session ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {session.order.map((p) => (
                  <span
                    key={p.id}
                    className={[
                      'rounded-full border px-3 py-1 text-xs font-semibold',
                      p.id === session.currentSpeakerId
                        ? 'border-[#b9902e]/40 bg-white/70 text-[#1c1917]'
                        : 'border-[#b9902e]/18 bg-white/55 text-[#4b463f]',
                    ].join(' ')}
                  >
                    {p.label}
                  </span>
                ))}
              </div>
            ) : (
              <div className="mt-4 text-sm text-[#4b463f]">Loading order…</div>
            )}
          </div>
        ) : null}

        <section className="mt-6 rt-surface rt-gild rounded-3xl p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Thought Space</h2>
              <div className="mt-1 text-xs text-[#4b463f]">Private drafts you can polish before posting to the Round Table.</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rt-gild inline-flex h-10 items-center justify-center rounded-xl border border-[#b9902e]/22 bg-white/65 px-4 text-xs font-semibold text-[#1c1917] transition hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35 disabled:opacity-45"
                type="button"
                onClick={onPolishDraft}
                disabled={!seat || privateDraft.trim().length === 0 || draftAiBusy}
              >
                {draftAiBusy ? 'Polishing…' : 'Polish with AI'}
              </button>
              <button
                className="rt-gild inline-flex h-10 items-center justify-center rounded-xl bg-[#b9902e] px-4 text-xs font-semibold text-black transition hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35 disabled:opacity-45"
                type="button"
                onClick={onPublishFromDraft}
                disabled={!seat || privateDraft.trim().length === 0}
              >
                Publish from Draft
              </button>
            </div>
          </div>

          {draftHelpVisible && seat ? (
            <div className="mt-4 rounded-2xl border border-violet-600/22 bg-violet-100/70 p-4 text-sm text-violet-900">
              Want help polishing this before you speak? Try "Polish with AI".
            </div>
          ) : null}

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rt-subpanel rounded-2xl p-4">
              <div className="text-xs font-semibold tracking-[0.14em] text-[#7a5b10]">PRIVATE DRAFT</div>
              <textarea
                aria-label="Private draft"
                autoComplete="off"
                className="rt-field mt-3 min-h-28 w-full resize-none rounded-2xl px-4 py-3 text-sm leading-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35 disabled:opacity-70"
                name="privateDraft"
                placeholder="Write a private draft…"
                disabled={!seat}
                value={privateDraft}
                onChange={(e) => setPrivateDraft(e.target.value)}
              />
            </div>

            <div className="rt-subpanel rounded-2xl p-4">
              <div className="text-xs font-semibold tracking-[0.14em] text-[#7a5b10]">AI SUGGESTION</div>
              {draftAiRewrite ? (
                <>
                  <div className="mt-3 rounded-2xl border border-[#b9902e]/20 bg-white/75 px-4 py-3 text-sm leading-7 text-[#1c1917]">
                    {draftAiRewrite}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      className="rt-gild inline-flex h-9 items-center justify-center rounded-xl bg-[#b9902e] px-3 text-xs font-semibold text-black transition hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35"
                      type="button"
                      onClick={() => setPrivateDraft(draftAiRewrite)}
                    >
                      Use Rewrite
                    </button>
                    <button
                      className="rt-gild inline-flex h-9 items-center justify-center rounded-xl border border-[#b9902e]/20 bg-white/65 px-3 text-xs font-semibold text-[#1c1917] transition hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35"
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(draftAiRewrite)
                        } catch {}
                      }}
                    >
                      Copy
                    </button>
                  </div>
                  {draftAiBullets.length ? (
                    <div className="mt-3 grid gap-2">
                      {draftAiBullets.map((b) => (
                        <div key={b} className="rounded-xl border border-[#b9902e]/16 bg-white/65 px-3 py-2 text-xs text-[#4b463f]">
                          {b}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="mt-3 text-sm text-[#4b463f]">Use "Polish with AI" to get a rewrite & structure hints.</div>
              )}
            </div>
          </div>
        </section>

        <div className="mt-6 rt-surface rt-gild rounded-3xl p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm font-semibold tracking-tight">The Round Table</div>
          </div>
          {paused ? (
            <div className="mt-4 rounded-2xl border border-red-500/24 bg-red-500/10 px-4 py-3 text-sm text-red-900">
              Discussion paused by facilitator.
            </div>
          ) : null}
          {facControl?.promptCard ? (
            <div className="mt-3 rounded-2xl border border-[#b9902e]/18 bg-white/65 px-4 py-3">
              <div className="text-xs font-semibold tracking-[0.14em] text-[#7a5b10]">FACILITATOR PROMPT</div>
              <div className="mt-2 text-sm leading-7 text-[#1c1917]">{facControl.promptCard.text}</div>
            </div>
          ) : null}
          {facControl?.poll ? (
            <div className="mt-3 rounded-2xl border border-[#b9902e]/18 bg-white/65 px-4 py-3">
              <div className="text-xs font-semibold tracking-[0.14em] text-[#7a5b10]">POLL</div>
              <div className="mt-2 text-sm font-semibold text-[#1c1917]">{facControl.poll.question}</div>
              {pollVote ? (
                <div className="mt-2 text-sm text-[#4b463f]">Your vote: {pollVote}</div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {facControl.poll.options.map((o) => (
                    <button
                      key={o}
                      className="rt-gild inline-flex h-9 items-center justify-center rounded-xl border border-[#b9902e]/18 bg-white/70 px-3 text-xs font-semibold text-[#1c1917] transition hover:bg-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35"
                      type="button"
                      onClick={() => {
                        if (!roomId) return
                        if (!seat) return
                        const poll = facControl.poll
                        if (!poll) return
                        try {
                          const key = facPollVotesKey(roomId, poll.id)
                          const votes = (getJson<Record<string, string>>(key) ?? {}) as Record<string, string>
                          votes[seat.id] = o
                          setJson(key, votes)
                          setPollVote(o)
                        } catch {
                          setPollVote(o)
                        }
                      }}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[#b9902e]/18 bg-white/70 px-3 py-3">
            <textarea
              aria-label="Share your thoughts with the Round Table…"
              autoComplete="off"
              className="min-h-10 w-full resize-none bg-transparent text-sm leading-7 text-[#1c1917] placeholder:text-[#6b645c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35"
              name="message"
              placeholder="Share your thoughts with the Round Table…"
              disabled={!seat || !canSpeakNow}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button
              aria-label="Send"
              className={[
                'inline-flex h-10 w-10 items-center justify-center rounded-xl transition',
                seat && canSpeakNow && draft.trim().length > 0
                  ? 'bg-[#b9902e] text-black hover:translate-y-[-1px]'
                  : 'cursor-not-allowed border border-[#b9902e]/18 bg-white/55 text-[#6b645c]',
              ].join(' ')}
              disabled={!seat || !canSpeakNow || draft.trim().length === 0}
              type="button"
              onClick={onPublish}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 text-xs text-[#4b463f]">
            {quotaError ? `Quota: ${quotaError}` : null}
            {!quotaError && isStructured && seat && isOverQuota ? 'Quota reached — you can no longer speak in this session.' : null}
            {!quotaError && isStructured && seat && !isOverQuota && !canSpeak ? 'Wait for your turn to speak.' : null}
            {!quotaError && paused ? 'Discussion paused — wait for the facilitator to resume.' : null}
            {!quotaError && !paused && (!isStructured || !seat || canSpeak) ? 'AI will highlight keywords and suggest citations as you type' : null}
          </div>
          {isStructured && seat && session ? (
            <div className="mt-2 text-xs text-[#6b645c]">
              Quota remaining: <span className="text-[#1c1917]">{quotaSpeechesRemaining}</span> speeches ·{' '}
              <span className="text-[#1c1917]">{quotaSecondsRemaining}s</span>
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            {room?.aiGuardEnabled ? <AiGuardianPanel room={room} posts={posts} /> : null}
          </div>

          <div className="lg:col-span-2">
            <div className="rt-surface rt-gild rounded-3xl p-6">
              <div className="text-sm font-semibold tracking-tight">Live Scroll</div>

              <div className="mt-4 grid gap-3">
                {posts.length === 0 ? (
                  <div className="rounded-2xl border border-[#b9902e]/18 bg-white/60 p-4">
                    <div className="text-sm font-semibold text-[#1c1917]">No messages yet.</div>
                    <div className="mt-2 text-sm leading-7 text-[#4b463f]">
                      Start in Thought Space: write a private draft, then press "Publish from Draft".
                    </div>
                  </div>
                ) : (
                  <>
                    {posts.length > maxVisible && !showAllMessages ? (
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#b9902e]/18 bg-white/55 px-4 py-3">
                        <div className="text-xs text-[#4b463f]">Showing latest {maxVisible} messages.</div>
                        <button
                          className="rt-gild inline-flex h-9 items-center justify-center rounded-xl border border-[#b9902e]/18 bg-white/70 px-3 text-xs font-semibold text-[#1c1917] transition hover:bg-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35"
                          type="button"
                          onClick={() => setShowAllMessages(true)}
                        >
                          Show all messages
                        </button>
                      </div>
                    ) : null}

                    {showAllMessages && posts.length > maxVisible ? (
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#b9902e]/18 bg-white/55 px-4 py-3">
                        <div className="text-xs text-[#4b463f]">Showing all messages.</div>
                        <button
                          className="rt-gild inline-flex h-9 items-center justify-center rounded-xl border border-[#b9902e]/18 bg-white/70 px-3 text-xs font-semibold text-[#1c1917] transition hover:bg-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35"
                          type="button"
                          onClick={() => setShowAllMessages(false)}
                        >
                          Show latest {maxVisible}
                        </button>
                      </div>
                    ) : null}

                    {visiblePosts.map((p) => (
                      <div key={p.id} className="rounded-2xl border border-[#b9902e]/18 bg-white/60 p-4">
                        <div className="text-xs text-[#6b645c]">{p.authorLabel}</div>
                        <div className="mt-2 text-sm leading-7 text-[#1c1917]">
                          {room?.aiGuardEnabled && guardianKeywords.length > 0
                            ? highlightTextParts(p.content, guardianKeywords.slice(0, 8)).map((part, idx) =>
                                part.isHighlight ? (
                                  <span
                                    key={`${p.id}-${idx}-${part.text}`}
                                    data-guardian-highlight="true"
                                    className="rounded-md bg-[#e0c06a]/35 px-1 font-semibold text-[#7a5b10]"
                                  >
                                    {part.text}
                                  </span>
                                ) : (
                                  <span key={`${p.id}-${idx}-${part.text}`}>{part.text}</span>
                                ),
                              )
                            : p.content}
                        </div>
                        <button
                          className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#b9902e]/18 bg-white/55 px-3 py-2 text-xs text-[#1c1917] transition hover:bg-white/75"
                          type="button"
                          onClick={() => onLike(p.id)}
                        >
                          <Heart className="h-3.5 w-3.5" />
                          Like
                          <span className="min-w-4 text-center text-[#7a5b10]">{p.likes}</span>
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
          </>
        )}
      </div>

      <AppNavDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        facilitatorRoomId={roomId}
        extraItems={
          seat ? (
            <button
              className="rounded-2xl border border-red-900/50 bg-red-950/20 px-4 py-3 text-left text-sm font-semibold text-red-200 transition hover:border-red-700/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35"
              type="button"
              onClick={onReleaseSeat}
            >
              Release Seat
            </button>
          ) : null
        }
      />
    </main>
  )
}
