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

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rand = mulberry32(seed)
    let w = 0
    let h = 0
    let raf = 0
    let last = performance.now()

    const particles: Particle[] = []
    const target = 28

    function resize(cvs: HTMLCanvasElement, c: CanvasRenderingContext2D) {
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1))
      w = Math.floor(window.innerWidth)
      h = Math.floor(window.innerHeight)
      cvs.width = Math.floor(w * dpr)
      cvs.height = Math.floor(h * dpr)
      cvs.style.width = `${w}px`
      cvs.style.height = `${h}px`
      c.setTransform(dpr, 0, 0, dpr, 0, 0)
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

    function drawRunicRing(c: CanvasRenderingContext2D, now: number) {
      const cx = w * 0.5
      const cy = h * 0.38
      const base = Math.min(w, h) * 0.44
      const t = now / 1000

      c.save()
      c.translate(cx, cy)
      c.rotate(t * 0.06)
      c.globalCompositeOperation = 'multiply'

      c.strokeStyle = 'rgba(185,144,46,0.08)'
      c.lineWidth = 1
      c.beginPath()
      c.arc(0, 0, base, 0, Math.PI * 2)
      c.stroke()

      c.strokeStyle = 'rgba(20,17,15,0.06)'
      c.setLineDash([2, 10])
      c.beginPath()
      c.arc(0, 0, base * 0.86, 0, Math.PI * 2)
      c.stroke()
      c.setLineDash([])

      c.strokeStyle = 'rgba(185,144,46,0.06)'
      c.lineWidth = 1
      for (let i = 0; i < 64; i++) {
        const a = (i / 64) * Math.PI * 2
        const r0 = base * 0.88
        const r1 = base * (0.88 + (i % 2 ? 0.035 : 0.02))
        c.beginPath()
        c.moveTo(Math.cos(a) * r0, Math.sin(a) * r0)
        c.lineTo(Math.cos(a) * r1, Math.sin(a) * r1)
        c.stroke()
      }

      c.rotate(-t * 0.12)
      c.fillStyle = 'rgba(185,144,46,0.10)'
      c.font = `${Math.max(10, Math.floor(base * 0.04))}px Cinzel, ui-serif`
      c.textAlign = 'center'
      c.textBaseline = 'middle'
      const runes = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ', 'ᛇ', 'ᛈ', 'ᛉ', 'ᛋ']
      for (let i = 0; i < 40; i++) {
        const a = (i / 40) * Math.PI * 2
        const rr = base * 0.73
        c.save()
        c.rotate(a)
        c.translate(0, -rr)
        c.rotate(-a + Math.PI * 0.5)
        c.fillText(runes[i % runes.length]!, 0, 0)
        c.restore()
      }

      c.restore()
      c.globalCompositeOperation = 'source-over'
    }

    function draw(c: CanvasRenderingContext2D, now: number) {
      const dt = clamp((now - last) / 16.67, 0.4, 2.2)
      last = now

      c.clearRect(0, 0, w, h)
      drawRunicRing(c, now)
      c.globalCompositeOperation = 'lighter'

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
        const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, glow)
        g.addColorStop(0, `hsla(${p.hue}, 92%, 60%, ${p.a * 0.55})`)
        g.addColorStop(0.55, `hsla(${p.hue}, 82%, 52%, ${p.a * 0.3})`)
        g.addColorStop(1, 'rgba(0,0,0,0)')
        c.fillStyle = g
        c.beginPath()
        c.arc(p.x, p.y, glow, 0, Math.PI * 2)
        c.fill()
      }

      c.globalCompositeOperation = 'source-over'
      raf = window.requestAnimationFrame((t) => draw(c, t))
    }

    resize(canvas, ctx)
    for (let i = 0; i < target; i++) spawn(i)
    raf = window.requestAnimationFrame((t) => draw(ctx, t))

    const onResize = () => resize(canvas, ctx)
    window.addEventListener('resize', onResize, { passive: true })
    return () => {
      window.removeEventListener('resize', onResize)
      window.cancelAnimationFrame(raf)
    }
  }, [reduced, seed])

  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-0 opacity-[0.18]" />
}
