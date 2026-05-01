import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import SideDrawer from '@/components/SideDrawer'
import useAuthSession from '@/hooks/useAuthSession'

export default function AppNavDrawer({
  open,
  onClose,
  title = 'Navigation',
  facilitatorRoomId,
  extraItems,
}: {
  open: boolean
  onClose: () => void
  title?: string
  facilitatorRoomId?: string
  extraItems?: ReactNode
}) {
  const { session, signOut } = useAuthSession()
  const isAuthed = !!session?.nickname

  return (
    <SideDrawer open={open} title={title} onClose={onClose}>
      <nav className="grid gap-2">
        {isAuthed ? (
          <div className="rounded-2xl border border-[#b9902e]/18 bg-white/55 px-4 py-3 text-sm text-[#1c1917]">
            Signed in as <span className="font-semibold">{session.nickname}</span>
          </div>
        ) : (
          <Link
            className="rounded-2xl border border-[#b9902e]/18 bg-white/70 px-4 py-3 text-sm font-semibold text-[#1c1917] transition hover:bg-white/85"
            to="/auth"
            onClick={onClose}
          >
            Sign In
          </Link>
        )}

        {isAuthed ? (
          <>
            <Link
              className="rounded-2xl border border-[#b9902e]/18 bg-white/70 px-4 py-3 text-sm font-semibold text-[#1c1917] transition hover:bg-white/85"
              to="/"
              onClick={onClose}
            >
              Home
            </Link>
            <Link
              className="rounded-2xl border border-[#b9902e]/18 bg-white/70 px-4 py-3 text-sm font-semibold text-[#1c1917] transition hover:bg-white/85"
              to="/create"
              onClick={onClose}
            >
              Create a Chamber
            </Link>
            <Link
              className="rounded-2xl border border-[#b9902e]/18 bg-white/70 px-4 py-3 text-sm font-semibold text-[#1c1917] transition hover:bg-white/85"
              to={facilitatorRoomId ? `/facilitator/${facilitatorRoomId}` : '/facilitator'}
              onClick={onClose}
            >
              Facilitator
            </Link>
            <Link
              className="rounded-2xl border border-[#b9902e]/18 bg-white/70 px-4 py-3 text-sm font-semibold text-[#1c1917] transition hover:bg-white/85"
              to="/profile"
              onClick={onClose}
            >
              Profile
            </Link>

            {extraItems}

          <button
            className="rounded-2xl border border-[#b9902e]/18 bg-white/70 px-4 py-3 text-left text-sm font-semibold text-[#1c1917] transition hover:bg-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35"
            type="button"
            onClick={async () => {
              await signOut()
              onClose()
            }}
          >
            Sign out
          </button>
          </>
        ) : null}
      </nav>
    </SideDrawer>
  )
}
