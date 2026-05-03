type SigilSegment = {
  label: string
  value: number
  color: string
}

function polar(cx: number, cy: number, r: number, angle: number) {
  const a = ((angle - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polar(cx, cy, r, endAngle)
  const end = polar(cx, cy, r, startAngle)
  const large = endAngle - startAngle <= 180 ? '0' : '1'
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y}`
}

export default function HelmSigil({
  segments,
  className,
}: {
  segments: SigilSegment[]
  className?: string
}) {
  const size = 260
  const cx = size / 2
  const cy = size / 2
  const ring = 86
  const total = Math.max(1, segments.reduce((s, x) => s + x.value, 0))
  let start = 0

  return (
    <svg className={className} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <defs>
        <radialGradient id="helm-sigil-fade" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.0)" />
          <stop offset="55%" stopColor="rgba(255,255,255,0.0)" />
          <stop offset="100%" stopColor="rgba(20,17,15,0.08)" />
        </radialGradient>
      </defs>

      <circle cx={cx} cy={cy} r={112} fill="rgba(255,255,255,0.20)" stroke="rgba(185,144,46,0.18)" />
      <circle cx={cx} cy={cy} r={96} fill="none" stroke="rgba(185,144,46,0.18)" strokeDasharray="2 10" />
      <circle cx={cx} cy={cy} r={74} fill="none" stroke="rgba(20,17,15,0.10)" />

      {segments.map((s) => {
        const angle = (s.value / total) * 360
        const end = start + angle
        const d = arcPath(cx, cy, ring, start, end)
        start = end
        return <path key={s.label} d={d} stroke={s.color} strokeWidth={14} fill="none" strokeLinecap="round" opacity={0.82} />
      })}

      {Array.from({ length: 56 }).map((_, i) => {
        const a = (i / 56) * Math.PI * 2
        const r0 = 102
        const r1 = i % 3 === 0 ? 114 : 110
        return (
          <path
            key={i}
            d={`M ${cx + Math.cos(a) * r0} ${cy + Math.sin(a) * r0} L ${cx + Math.cos(a) * r1} ${cy + Math.sin(a) * r1}`}
            stroke="rgba(185,144,46,0.16)"
            strokeWidth={1}
            strokeLinecap="round"
          />
        )
      })}

      <circle cx={cx} cy={cy} r={52} fill="rgba(246,237,215,0.72)" stroke="rgba(185,144,46,0.20)" />
      <path
        d={`M ${cx} ${cy - 22} L ${cx + 16} ${cy} L ${cx} ${cy + 22} L ${cx - 16} ${cy} Z`}
        fill="rgba(185,144,46,0.22)"
        stroke="rgba(185,144,46,0.26)"
      />
      <circle cx={cx} cy={cy} r={36} fill="url(#helm-sigil-fade)" />
    </svg>
  )
}

