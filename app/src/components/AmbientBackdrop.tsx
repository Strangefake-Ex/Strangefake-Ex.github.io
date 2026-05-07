import { useEffect, useRef } from 'react'

import usePrefersReducedMotion from '@/hooks/usePrefersReducedMotion'

type Particle = {
  x: number
  y: number
  r: number
  vx: number
  vy: number
  a: number
  ha: number
  hue: number
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export default function AmbientBackdrop({ seed = 1123 }: { seed?: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    if (reduced) return

    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    if (!ctx) return

    const rand = mulberry32(seed)
    let w = 0
    let h = 0
    let raf = 0
    let last = performance.now()

    const particles: Particle[] = []
    const target = 28

    function resize() {
      if (!canvas) return
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1))
      w = Math.floor(window.innerWidth)
      h = Math.floor(window.innerHeight)
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function spawn(i: number) {
      const edge = rand()
      const x = edge < 0.33 ? rand() * w : edge < 0.66 ? -20 : w + 20
      const y = edge < 0.33 ? -20 : edge < 0.66 ? rand() * h : h + 20
      const s = 0.08 + rand() * 0.22
      particles[i] = {
        x,
        y,
        r: 0.6 + rand() * 1.8,
        vx: (rand() - 0.5) * s,
        vy: (rand() - 0.5) * s,
        a: 0.03 + rand() * 0.08,
        ha: rand() * Math.PI * 2,
        hue: 38 + rand() * 12,
      }
    }

    function drawRunicRing(now: number) {
      const cx = w * 0.5
      const cy = h * 0.38
      const base = Math.min(w, h) * 0.44
      const t = now / 1000

      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(t * 0.06)
      ctx.globalCompositeOperation = 'multiply'

      ctx.strokeStyle = 'rgba(185,144,46,0.08)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(0, 0, base, 0, Math.PI * 2)
      ctx.stroke()

      ctx.strokeStyle = 'rgba(20,17,15,0.06)'
      ctx.setLineDash([2, 10])
      ctx.beginPath()
      ctx.arc(0, 0, base * 0.86, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])

      ctx.strokeStyle = 'rgba(185,144,46,0.06)'
      ctx.lineWidth = 1
      for (let i = 0; i < 64; i++) {
        const a = (i / 64) * Math.PI * 2
        const r0 = base * 0.88
        const r1 = base * (0.88 + (i % 2 ? 0.035 : 0.02))
        ctx.beginPath()
        ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0)
        ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1)
        ctx.stroke()
      }

      ctx.rotate(-t * 0.12)
      ctx.fillStyle = 'rgba(185,144,46,0.10)'
      ctx.font = `${Math.max(10, Math.floor(base * 0.04))}px Cinzel, ui-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const runes = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ', 'ᛇ', 'ᛈ', 'ᛉ', 'ᛋ']
      for (let i = 0; i < 40; i++) {
        const a = (i / 40) * Math.PI * 2
        const rr = base * 0.73
        ctx.save()
        ctx.rotate(a)
        ctx.translate(0, -rr)
        ctx.rotate(-a + Math.PI * 0.5)
        ctx.fillText(runes[i % runes.length]!, 0, 0)
        ctx.restore()
      }

      ctx.restore()
      ctx.globalCompositeOperation = 'source-over'
    }

    function draw(now: number) {
      const dt = clamp((now - last) / 16.67, 0.4, 2.2)
      last = now

      ctx.clearRect(0, 0, w, h)
      drawRunicRing(now)
      ctx.globalCompositeOperation = 'lighter'

      const t = now / 1000
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]!
        const nx = Math.sin(t * 0.45 + p.ha) * 0.14
        const ny = Math.cos(t * 0.42 + p.ha) * 0.14
        p.x += (p.vx + nx) * dt
        p.y += (p.vy + ny) * dt
        p.ha += 0.004 * dt

        if (p.x < -60 || p.x > w + 60 || p.y < -60 || p.y > h + 60) spawn(i)

        const glow = 9 + p.r * 8
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glow)
        g.addColorStop(0, `hsla(${p.hue}, 92%, 60%, ${p.a * 0.55})`)
        g.addColorStop(0.55, `hsla(${p.hue}, 82%, 52%, ${p.a * 0.3})`)
        g.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(p.x, p.y, glow, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalCompositeOperation = 'source-over'
      raf = window.requestAnimationFrame(draw)
    }

    resize()
    for (let i = 0; i < target; i++) spawn(i)
    raf = window.requestAnimationFrame(draw)

    window.addEventListener('resize', resize, { passive: true })
    return () => {
      window.removeEventListener('resize', resize)
      window.cancelAnimationFrame(raf)
    }
  }, [reduced, seed])

  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-0 opacity-[0.18]" />
}
