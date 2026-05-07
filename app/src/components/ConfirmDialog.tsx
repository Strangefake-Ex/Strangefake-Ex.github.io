import { useEffect, useRef } from 'react'

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  description?: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const confirmRef = useRef<HTMLButtonElement | null>(null)
  const onCancelRef = useRef(onCancel)
  onCancelRef.current = onCancel

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => confirmRef.current?.focus(), 0)
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancelRef.current()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.clearTimeout(t)
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6 py-10">
      <button aria-label="Close" className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" type="button" onClick={onCancel} />
      <div className="rt-surface rt-gild relative w-full max-w-md rounded-3xl p-6 shadow-[0_30px_80px_rgba(20,17,15,0.22)]" role="dialog" aria-label={title}>
        <div className="text-lg font-semibold tracking-tight text-[#1c1917]">{title}</div>
        {description ? <div className="mt-2 text-sm leading-7 text-[#4b463f]">{description}</div> : null}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            className="rt-gild inline-flex h-11 items-center justify-center rounded-2xl border border-[#b9902e]/20 bg-white/70 px-4 text-sm font-semibold text-[#1c1917] transition hover:bg-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35"
            type="button"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            className="rt-gild inline-flex h-11 items-center justify-center rounded-2xl bg-[#b9902e] px-4 text-sm font-semibold text-black transition hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35"
            type="button"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
