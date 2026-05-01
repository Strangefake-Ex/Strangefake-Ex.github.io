import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Plus, Ticket } from 'lucide-react'

import { createLocalRoomRepository, type Room } from '@/repositories/roomRepository'

export default function Lobby() {
  const [params] = useSearchParams()
  const isCreate = params.get('create') === '1'
  const navigate = useNavigate()
  const repo = useMemo(() => createLocalRoomRepository(), [])

  const [rooms, setRooms] = useState<Room[]>([])

  const [joinCode, setJoinCode] = useState('')

  const [title, setTitle] = useState('')
  const [course, setCourse] = useState('')
  const [prompt, setPrompt] = useState('')

  useEffect(() => {
    repo.listRooms().then(setRooms)
  }, [repo])

  async function onCreate() {
    const trimmedTitle = title.trim()
    const trimmedPrompt = prompt.trim()
    if (!trimmedTitle || !trimmedPrompt) return

    const created = await repo.createRoom({
      title: trimmedTitle,
      course: course.trim() || undefined,
      prompt: trimmedPrompt,
    })
    navigate(`/room/${created.id}`)
  }

  function onJoin() {
    const code = joinCode.trim()
    if (!code) return
    navigate(`/room/${code}`)
  }

  return (
    <main className="relative z-10 min-h-dvh bg-transparent font-body text-[#1c1917] rt-page">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-6 focus:top-6 focus:z-50 focus:rounded-xl focus:bg-[#d7b25a] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-black"
        href="#main"
      >
        Skip to content
      </a>
      <div className="mx-auto max-w-5xl px-6 py-10" id="main">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Lobby</h1>
          <Link className="text-sm text-[#4b463f] hover:text-[#1c1917]" to="/">
            Back
          </Link>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div className="rt-surface rt-gild rounded-2xl p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold tracking-tight">
                  {isCreate ? 'Create Room' : 'Join Room'}
                </div>
                <div className="flex gap-2 text-xs">
                  <Link
                    className={[
                      'rounded-full px-3 py-1 transition',
                      isCreate ? 'bg-[#b9902e] text-black' : 'border border-[#b9902e]/18 bg-white/55 text-[#1c1917] hover:bg-white/75',
                    ].join(' ')}
                    to="/lobby?create=1"
                  >
                    Create
                  </Link>
                  <Link
                    className={[
                      'rounded-full px-3 py-1 transition',
                      !isCreate ? 'bg-[#b9902e] text-black' : 'border border-[#b9902e]/18 bg-white/55 text-[#1c1917] hover:bg-white/75',
                    ].join(' ')}
                    to="/lobby"
                  >
                    Join
                  </Link>
                </div>
              </div>

              {isCreate ? (
                <div className="mt-6 grid gap-4">
                  <div className="grid gap-2">
                    <label className="text-xs text-[#4b463f]" htmlFor="title">
                      Room Title
                    </label>
                    <input
                      id="title"
                      autoComplete="off"
                      className="rt-field h-11 rounded-xl px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35"
                      name="title"
                      placeholder="e.g. Week 6 Seminar"
                      spellCheck={false}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-xs text-[#4b463f]" htmlFor="course">
                      Course (optional)
                    </label>
                    <input
                      id="course"
                      autoComplete="off"
                      className="rt-field h-11 rounded-xl px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35"
                      name="course"
                      placeholder="e.g. HCI"
                      spellCheck={false}
                      value={course}
                      onChange={(e) => setCourse(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-xs text-[#4b463f]" htmlFor="prompt">
                      Prompt
                    </label>
                    <textarea
                      id="prompt"
                      autoComplete="off"
                      className="rt-field min-h-28 rounded-xl px-4 py-3 text-sm leading-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35"
                      name="prompt"
                      placeholder="Write the guiding question for this discussion…"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                    />
                  </div>

                  <button
                    className="rt-gild group inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#b9902e] px-4 text-sm font-semibold text-black shadow-[0_18px_40px_rgba(185,144,46,0.16)] transition hover:translate-y-[-1px]"
                    type="button"
                    onClick={onCreate}
                  >
                    <Plus className="h-4 w-4" />
                    Create Room
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              ) : (
                <div className="mt-6 grid gap-4">
                  <div className="grid gap-2">
                    <label className="text-xs text-[#4b463f]" htmlFor="code">
                      Room ID
                    </label>
                    <input
                      id="code"
                      autoComplete="off"
                      className="rt-field h-11 rounded-xl px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35"
                      name="inviteCode"
                      placeholder="Paste a roomId…"
                      spellCheck={false}
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                    />
                  </div>

                  <button
                    className="rt-gild group inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#b9902e] px-4 text-sm font-semibold text-black shadow-[0_18px_40px_rgba(185,144,46,0.16)] transition hover:translate-y-[-1px]"
                    type="button"
                    onClick={onJoin}
                  >
                    <Ticket className="h-4 w-4" />
                    Enter Room
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="rt-surface rt-gild rounded-2xl p-6">
              <div className="text-sm font-semibold tracking-tight">Recent Rooms</div>
              <div className="mt-4 grid gap-3">
                {rooms.length === 0 ? (
                  <div className="text-sm text-[#4b463f]">No rooms yet.</div>
                ) : (
                  rooms.slice(0, 6).map((r) => (
                    <Link
                      key={r.id}
                      className="rounded-xl border border-[#b9902e]/18 bg-white/60 p-4 transition hover:bg-white/75"
                      to={`/room/${r.id}`}
                    >
                      <div className="text-sm font-semibold text-[#1c1917]">{r.title}</div>
                      <div className="mt-1 max-h-12 overflow-hidden text-xs leading-6 text-[#4b463f]">{r.prompt}</div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
