import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, Shield } from 'lucide-react'

import AppNavDrawer from '@/components/AppNavDrawer'
import { createLocalRoomRepository, type Room } from '@/repositories/roomRepository'

export default function FacilitatorIndex() {
  const navigate = useNavigate()
  const roomRepo = useMemo(() => createLocalRoomRepository(), [])
  const [rooms, setRooms] = useState<Room[] | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    roomRepo.listRooms().then((x) => {
      setRooms(x)
      if (x.length > 0) navigate(`/facilitator/${x[0]!.id}`, { replace: true })
    })
  }, [navigate, roomRepo])

  return (
    <main className="relative z-10 min-h-dvh bg-transparent font-body text-[#1c1917] rt-page">
      <div className="mx-auto max-w-5xl px-6 py-10">
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

        {rooms && rooms.length === 0 ? (
          <div className="mt-10 rt-surface rt-gild rounded-3xl p-8">
            <div className="text-xs font-semibold tracking-[0.18em] text-[#7a5b10]">FACILITATOR</div>
            <h1 className="mt-4 font-display text-3xl font-semibold tracking-[-0.03em] text-[#1c1917]">No chambers yet</h1>
            <div className="mt-3 max-w-xl text-sm leading-7 text-[#4b463f]">
              Create a chamber first, then return to the Facilitator&apos;s Helm to monitor participation, alerts, and AI summaries.
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                className="rt-gild inline-flex h-11 items-center justify-center rounded-2xl bg-[#b9902e] px-5 text-sm font-semibold text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35"
                to="/create"
              >
                Create a Chamber
              </Link>
              <Link
                className="rt-gild inline-flex h-11 items-center justify-center rounded-2xl border border-[#b9902e]/25 bg-white/60 px-5 text-sm font-semibold text-[#1c1917] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35"
                to="/"
              >
                Back Home
              </Link>
            </div>
          </div>
        ) : null}
      </div>

      <AppNavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </main>
  )
}
