import { useEffect } from 'react'
import { X } from 'lucide-react'

import usePrefersReducedMotion from '@/hooks/usePrefersReducedMotion'

export default function SideDrawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose, open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        aria-label="Close"
        className={[
          'absolute inset-0 z-0 backdrop-blur-[1.5px] overscroll-contain',
          reduced ? 'bg-[#14110f]/20' : 'bg-[#14110f]/20 transition-opacity duration-200',
          'opacity-100',
        ].join(' ')}
        type="button"
        onClick={onClose}
      />
      <aside
        aria-modal="true"
        className={[
          'absolute right-0 top-0 z-10 h-full w-[min(420px,84vw)] bg-[#f6edd7]/88 p-6 shadow-[0_30px_90px_rgba(20,17,15,0.22)] backdrop-blur-md overscroll-contain',
          reduced ? '' : 'transition-transform duration-200 ease-out',
          'translate-x-0',
        ].join(' ')}
        role="dialog"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -left-16 w-16 bg-gradient-to-r from-[#14110f]/18 via-[#14110f]/10 to-transparent"
        />
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-[#1c1917]">{title}</h2>
          <button
            aria-label="Close drawer"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#b9902e]/22 bg-white/70 text-[#1c1917] transition hover:bg-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35"
            type="button"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6">{children}</div>
      </aside>
    </div>
  )
}
