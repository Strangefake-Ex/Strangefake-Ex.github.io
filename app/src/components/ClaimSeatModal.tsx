import { useMemo, useState } from 'react'
import { Shield, Sparkles, UserRound } from 'lucide-react'

import { createLocalSeatRepository } from '@/repositories/seatRepository'
import type { Room } from '@/repositories/roomRepository'

export default function ClaimSeatModal({
  room,
  onClaimed,
}: {
  room: Room
  onClaimed: () => void
}) {
  const repo = useMemo(() => createLocalSeatRepository(), [])
  const [name, setName] = useState('')
  const [anonymous, setAnonymous] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = name.trim().length > 0

  async function onSubmit() {
    if (!canSubmit) return
    setError(null)
    try {
      await repo.claimSeat(room.id, { displayName: name.trim(), isAnonymous: anonymous })
      onClaimed()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to claim seat'
      setError(msg)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6 py-10">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />
      <div className="rt-surface rt-gild relative w-full max-w-lg rounded-3xl p-6 shadow-[0_30px_80px_rgba(20,17,15,0.24)]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#b9902e] text-black shadow-[0_18px_44px_rgba(185,144,46,0.18)]">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-[#1c1917]">
                Claim Your Seat
              </h2>
              <div className="mt-1 text-sm text-[#4b463f]">
                {room.participants}/{room.capacity} knights · {room.security === 'fortified' ? 'Fortified' : room.security === 'guarded' ? 'Guarded' : 'Open'}
              </div>
            </div>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-600/28 bg-violet-200/60 text-violet-900">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          <div className="grid gap-2">
            <label className="text-xs font-semibold tracking-[0.14em] text-[#7a5b10]" htmlFor="seat-name">
              YOUR NAME
            </label>
            <div className="flex items-center gap-3 rounded-2xl border border-[#b9902e]/18 bg-white/70 px-3 py-2">
              <UserRound className="h-4 w-4 text-[#6b645c]" />
              <input
                aria-label="Your name"
                autoComplete="nickname"
                className="h-10 w-full bg-transparent text-sm text-[#1c1917] placeholder:text-[#6b645c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35"
                id="seat-name"
                name="displayName"
                placeholder="Type a name to join…"
                spellCheck={false}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <button
            className={[
              'flex w-full items-center justify-between gap-3 rounded-2xl border bg-white/60 p-4 text-left transition',
              anonymous ? 'border-violet-600/40' : 'border-[#b9902e]/18 hover:border-[#b9902e]/28',
            ].join(' ')}
            type="button"
            onClick={() => setAnonymous((v) => !v)}
          >
            <div>
              <div className="text-sm font-semibold text-[#1c1917]">Remain anonymous</div>
              <div className="mt-1 text-xs text-[#4b463f]">Your public label becomes “Anonymous Knight”.</div>
            </div>
            <div
              aria-hidden
              className={[
                'h-6 w-10 rounded-full border transition',
                anonymous ? 'border-violet-600/50 bg-violet-500/25' : 'border-[#b9902e]/20 bg-white/60',
              ].join(' ')}
            >
              <div
                className={[
                  'h-5 w-5 translate-x-0.5 rounded-full bg-[#1c1917]/20 transition',
                  anonymous ? 'translate-x-[18px] bg-violet-200' : 'bg-[#1c1917]/25',
                ].join(' ')}
              />
            </div>
          </button>

          {error ? <div className="text-sm text-red-300">{error}</div> : null}

          <button
            className={[
              'inline-flex h-12 items-center justify-center rounded-2xl px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35',
              canSubmit ? 'bg-[#b9902e] text-black hover:translate-y-[-1px]' : 'cursor-not-allowed border border-[#b9902e]/18 bg-white/55 text-[#6b645c]',
            ].join(' ')}
            type="button"
            disabled={!canSubmit}
            onClick={onSubmit}
          >
            Claim Seat
          </button>
        </div>
      </div>
    </div>
  )
}
