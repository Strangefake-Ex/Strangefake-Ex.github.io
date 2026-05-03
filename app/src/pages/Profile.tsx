import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, Calendar, Crown, Menu, Shield, Sparkles, Swords, Trophy } from 'lucide-react'

import { createLocalPostRepository, type Post } from '@/repositories/postRepository'
import { createLocalRoomRepository, type Room } from '@/repositories/roomRepository'
import AppNavDrawer from '@/components/AppNavDrawer'

type ChamberRow = {
  roomId: string
  title: string
  topic: string
  createdAt: number
  minutes: number
  tag: string
  impact: number
}

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x.getTime()
}

function formatDayKey(ts: number) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function buildHeatmap(posts: Post[], days: number) {
  const today = startOfDay(new Date())
  const start = today - (days - 1) * 24 * 60 * 60 * 1000
  const counts = new Map<string, number>()
  for (const p of posts) {
    const key = formatDayKey(startOfDay(new Date(p.createdAt)))
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const cells: Array<{ day: number; key: string; count: number }> = []
  for (let i = 0; i < days; i++) {
    const day = start + i * 24 * 60 * 60 * 1000
    const key = formatDayKey(day)
    cells.push({ day, key, count: counts.get(key) ?? 0 })
  }
  return cells
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function computeImpact(posts: Post[]) {
  const totalLikes = posts.reduce((sum, p) => sum + p.likes, 0)
  const base = totalLikes * 12 + posts.length * 8
  return clamp(Math.round(base / Math.max(1, posts.length)), 10, 99)
}

function monthsMatch(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

export default function Profile() {
  const roomRepo = useMemo(() => createLocalRoomRepository(), [])
  const postRepo = useMemo(() => createLocalPostRepository(localStorage, { seedDemo: true }), [])
  const [drawerOpen, setDrawerOpen] = useState(false)

  const [rooms, setRooms] = useState<Room[]>([])
  const [posts, setPosts] = useState<Post[]>([])

  useEffect(() => {
    roomRepo.listRooms().then(setRooms)
  }, [roomRepo])

  useEffect(() => {
    if (rooms.length === 0) {
      setPosts([])
      return
    }
    Promise.all(rooms.map((r) => postRepo.listPosts(r.id))).then((all) => setPosts(all.flat()))
  }, [postRepo, rooms])

  const totalSpeeches = posts.length
  const totalLikes = posts.reduce((sum, p) => sum + p.likes, 0)
  const avgImpact = clamp(Math.round(((totalLikes + totalSpeeches) / Math.max(1, totalSpeeches)) * 18), 0, 99)
  const thisMonth = posts.filter((p) => monthsMatch(new Date(p.createdAt), new Date())).length
  const heatmap = useMemo(() => buildHeatmap(posts, 30), [posts])

  const chamberRows = useMemo(() => {
    const byRoom = new Map<string, Post[]>()
    for (const p of posts) byRoom.set(p.roomId, [...(byRoom.get(p.roomId) ?? []), p])
    const rows: ChamberRow[] = []
    for (const r of rooms) {
      const rp = byRoom.get(r.id) ?? []
      if (rp.length === 0) continue
      rows.push({
        roomId: r.id,
        title: r.title,
        topic: r.topic,
        createdAt: r.createdAt,
        minutes: Math.max(6, Math.round(rp.length * 4.2)),
        tag: rp.length >= 4 ? 'Highly Engaged' : rp.length >= 2 ? 'Thoughtful' : 'Constructive',
        impact: computeImpact(rp),
      })
    }
    return rows.sort((a, b) => b.createdAt - a.createdAt)
  }, [posts, rooms])

  const achievements = useMemo(() => {
    const list: Array<{ label: string; icon: React.ReactNode }> = []
    if (totalSpeeches >= 1) list.push({ label: 'First Voice', icon: <BadgeCheck className="h-4 w-4" /> })
    if (totalSpeeches >= 5) list.push({ label: 'Scholar', icon: <Crown className="h-4 w-4" /> })
    if (avgImpact >= 70) list.push({ label: 'Sage', icon: <Sparkles className="h-4 w-4" /> })
    if (totalLikes >= 3) list.push({ label: 'Shield Bearer', icon: <Shield className="h-4 w-4" /> })
    if (totalSpeeches >= 10) list.push({ label: 'Champion', icon: <Trophy className="h-4 w-4" /> })
    return list.slice(0, 6)
  }, [avgImpact, totalLikes, totalSpeeches])

  return (
    <main className="relative z-10 min-h-dvh bg-transparent font-body text-[#1c1917] rt-page">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-6 focus:top-6 focus:z-50 focus:rounded-xl focus:bg-[#d7b25a] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-black"
        href="#main"
      >
        Skip to content
      </a>

      <div className="relative mx-auto max-w-6xl px-6 py-10" id="main">
        <div className="flex items-center justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#b9902e] text-black shadow-[0_18px_44px_rgba(185,144,46,0.18)]">
            <Shield className="h-5 w-5" />
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

        <div className="mt-10 text-center">
          <h1 className="font-display text-4xl font-semibold tracking-[-0.03em] text-[#1c1917]">Your Knight&apos;s Chronicle</h1>
          <div className="mx-auto mt-3 max-w-xl text-sm text-[#4b463f]">
            Review your contributions to the Round Table and your journey through the realm of scholarly discourse.
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-12 rt-fade-up">
          <section className="lg:col-span-4">
            <div className="rt-surface rt-gild rounded-3xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs tracking-[0.18em] text-[#6b645c]">SIR</div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight text-[#1c1917]">Aldric</div>
                  <div className="mt-1 text-xs font-semibold tracking-[0.14em] text-[#7a5b10]">KNIGHT-ERRANT</div>
                  <div className="mt-3 inline-flex items-center gap-2 text-xs text-[#4b463f]">
                    <Calendar className="h-4 w-4" />
                    Joined September 2024
                  </div>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#b9902e] text-black shadow-[0_18px_44px_rgba(185,144,46,0.16)]">
                  <Crown className="h-7 w-7" />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="rt-subpanel rounded-2xl p-4 text-center">
                  <div className="text-lg font-semibold text-[#1c1917]">{totalLikes * 12 + totalSpeeches * 8}</div>
                  <div className="mt-1 text-[10px] font-semibold tracking-[0.14em] text-[#6b645c]">CONTRIBUTION</div>
                </div>
                <div className="rt-subpanel rounded-2xl p-4 text-center">
                  <div className="text-lg font-semibold text-[#1c1917]">{totalSpeeches}</div>
                  <div className="mt-1 text-[10px] font-semibold tracking-[0.14em] text-[#6b645c]">SPEECHES</div>
                </div>
                <div className="rt-subpanel rounded-2xl p-4 text-center">
                  <div className="text-lg font-semibold text-[#1c1917]">{clamp(avgImpact, 1, 99)}</div>
                  <div className="mt-1 text-[10px] font-semibold tracking-[0.14em] text-[#6b645c]">SHIELD</div>
                </div>
              </div>

              <div className="mt-6">
                <div className="text-xs font-semibold tracking-[0.14em] text-[#7a5b10]">ACHIEVEMENTS</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {achievements.length === 0 ? (
                    <div className="text-sm text-[#4b463f]">Speak once to earn your first badge.</div>
                  ) : (
                    achievements.map((a) => (
                      <span
                        key={a.label}
                        className="inline-flex items-center gap-2 rounded-full border border-[#b9902e]/18 bg-white/60 px-3 py-2 text-xs font-semibold text-[#1c1917]"
                      >
                        {a.icon}
                        {a.label}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-6 rt-subpanel rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs tracking-[0.14em] text-[#6b645c]">RANK PROGRESS</div>
                  <div className="text-xs font-semibold text-[#7a5b10]">Level {clamp(1 + Math.floor(totalSpeeches / 3), 1, 12)}</div>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#1c1917]/15">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#b9902e] to-violet-500"
                    style={{ width: `${clamp((totalSpeeches % 3) / 3, 0, 1) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="lg:col-span-8">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rt-surface rt-gild rounded-2xl p-4 shadow-[0_18px_50px_rgba(20,17,15,0.08)]">
                <div className="text-xs font-semibold tracking-[0.16em] text-[#7a5b10]">TOTAL SPEECHES</div>
                <div className="mt-2 text-3xl font-semibold tracking-tight text-[#1c1917]">{totalSpeeches}</div>
              </div>
              <div className="rt-surface rt-gild rounded-2xl p-4 shadow-[0_18px_50px_rgba(20,17,15,0.08)]">
                <div className="text-xs font-semibold tracking-[0.16em] text-[#7a5b10]">AVG IMPACT</div>
                <div className="mt-2 text-3xl font-semibold tracking-tight text-[#1c1917]">{avgImpact}%</div>
              </div>
              <div className="rt-surface rt-gild rounded-2xl p-4 shadow-[0_18px_50px_rgba(20,17,15,0.08)]">
                <div className="text-xs font-semibold tracking-[0.16em] text-[#7a5b10]">THIS MONTH</div>
                <div className="mt-2 text-3xl font-semibold tracking-tight text-[#1c1917]">{thisMonth}</div>
              </div>
            </div>

            <div className="mt-6 rt-surface rt-gild rounded-3xl p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold tracking-[0.14em] text-[#7a5b10]">CONTRIBUTION HEATMAP</div>
                  <div className="mt-2 text-sm text-[#4b463f]">Last 30 days</div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-xl border border-[#b9902e]/18 bg-white/60 px-3 py-2 text-xs font-semibold text-[#1c1917]">
                  <Swords className="h-4 w-4 text-[#6b645c]" />
                  {totalSpeeches} actions
                </div>
              </div>

              <div className="mt-4 grid grid-cols-10 gap-2">
                {heatmap.map((c) => {
                  const tone =
                    c.count === 0
                      ? 'bg-[#1c1917]/10 border-[#b9902e]/16'
                      : c.count === 1
                        ? 'bg-[#e0c06a]/35 border-[#b9902e]/24'
                        : c.count === 2
                          ? 'bg-[#e0c06a]/50 border-[#b9902e]/32'
                          : 'bg-[#b9902e]/55 border-[#b9902e]/38'
                  return (
                    <div
                      key={c.key}
                      className={['h-6 rounded-md border shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]', tone].join(' ')}
                      title={`${c.key}: ${c.count}`}
                    />
                  )
                })}
              </div>
            </div>

            <div className="mt-6 rt-surface rt-gild rounded-3xl p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm font-semibold tracking-tight text-[#1c1917]">Recent Chambers</div>
                <div className="text-xs text-[#4b463f]">{chamberRows.length} sessions</div>
              </div>

              <div className="mt-4 grid gap-3">
                {chamberRows.length === 0 ? (
                  <div className="text-sm text-[#4b463f]">No sessions yet. Join a chamber and speak once.</div>
                ) : (
                  chamberRows.map((r) => (
                    <div key={r.roomId} className="rt-surface rt-gild rounded-2xl px-4 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-[#1c1917]">{r.title}</div>
                          <div className="mt-1 text-xs text-[#4b463f]">{r.topic}</div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-[#b9902e]/18 bg-white/60 px-3 py-1 text-[10px] font-semibold tracking-[0.14em] text-[#1c1917]">
                              {r.tag}
                            </span>
                            <span className="text-xs text-[#6b645c]">{r.minutes} min</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#b9902e]/20 bg-white/60 text-sm font-semibold text-[#7a5b10]">
                            {r.impact}
                          </div>
                          <Link
                            className="rt-gild inline-flex h-10 items-center justify-center rounded-xl bg-[#b9902e] px-4 text-sm font-semibold text-black transition hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35"
                            to={`/room/${r.roomId}`}
                          >
                            Re-enter
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      <AppNavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </main>
  )
}
