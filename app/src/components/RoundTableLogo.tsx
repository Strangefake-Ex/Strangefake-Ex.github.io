import { useId } from 'react'

type Tone = 'normal' | 'bold'

export default function RoundTableLogo({
  className,
  ariaLabel = 'The Round Table',
  tone = 'normal',
}: {
  className?: string
  ariaLabel?: string
  tone?: Tone
}) {
  const id = useId()
  const goldId = `${id}-rt-logo-gold`
  const inkId = `${id}-rt-logo-ink`

  const goldStops =
    tone === 'bold'
      ? [
          { color: '#f4dda0', opacity: 1 },
          { color: '#d7b25a', opacity: 0.98, offset: 0.38 },
          { color: '#9f7520', opacity: 0.96, offset: 1 },
        ]
      : [
          { color: '#f4dda0', opacity: 0.95 },
          { color: '#d7b25a', opacity: 0.85, offset: 0.38 },
          { color: '#9f7520', opacity: 0.82, offset: 1 },
        ]

  const ringStrokeOpacity = tone === 'bold' ? 0.56 : 0.34
  const dashStrokeOpacity = tone === 'bold' ? 0.3 : 0.18
  const innerStroke = tone === 'bold' ? 'rgba(185,144,46,0.38)' : 'rgba(185,144,46,0.22)'
  const nodeStroke = tone === 'bold' ? 'rgba(185,144,46,0.5)' : 'rgba(185,144,46,0.30)'
  const nodeDot = tone === 'bold' ? 'rgba(185,144,46,0.46)' : 'rgba(185,144,46,0.30)'
  const centerStroke = tone === 'bold' ? 'rgba(185,144,46,0.38)' : 'rgba(185,144,46,0.26)'
  const centerFill = tone === 'bold' ? 'rgba(246,237,215,0.82)' : 'rgba(246,237,215,0.72)'

  return (
    <svg
      className={className}
      viewBox="0 0 240 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <linearGradient id={goldId} x1="36" y1="36" x2="204" y2="204" gradientUnits="userSpaceOnUse">
          <stop stopColor={goldStops[0].color} stopOpacity={goldStops[0].opacity} />
          <stop offset={goldStops[1].offset} stopColor={goldStops[1].color} stopOpacity={goldStops[1].opacity} />
          <stop offset={goldStops[2].offset} stopColor={goldStops[2].color} stopOpacity={goldStops[2].opacity} />
        </linearGradient>
        <radialGradient id={inkId} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(120 120) rotate(90) scale(118)">
          <stop stopColor="rgba(20,17,15,0.10)" />
          <stop offset="0.55" stopColor="rgba(20,17,15,0.05)" />
          <stop offset="1" stopColor="rgba(20,17,15,0)" />
        </radialGradient>
      </defs>

      <circle cx="120" cy="120" r="112" fill={`url(#${inkId})`} stroke={`url(#${goldId})`} strokeOpacity={ringStrokeOpacity} strokeWidth="2" />
      <circle cx="120" cy="120" r="96" stroke={`url(#${goldId})`} strokeOpacity={dashStrokeOpacity} strokeWidth="2" strokeDasharray="2 11" />

      <path
        d="M120 72c18 0 34 6 44 16 10 10 16 26 16 44s-6 34-16 44c-10 10-26 16-44 16s-34-6-44-16c-10-10-16-26-16-44s6-34 16-44c10-10 26-16 44-16Z"
        stroke={innerStroke}
        strokeWidth="2"
      />

      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2
        const x = 120 + Math.cos(a) * 70
        const y = 120 + Math.sin(a) * 70
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="8.5" fill="rgba(246,237,215,0.85)" stroke={nodeStroke} strokeWidth="2" />
            <circle cx={x} cy={y} r="2.2" fill={nodeDot} />
          </g>
        )
      })}

      <path
        d="M120 98c10 0 18 8 18 18s-8 18-18 18-18-8-18-18 8-18 18-18Z"
        fill={centerFill}
        stroke={centerStroke}
        strokeWidth="2"
      />
      <path
        d="M120 105l4 7-4 7-4-7 4-7Z"
        fill={centerStroke}
        stroke={centerStroke}
        strokeWidth="1.6"
      />
      <path
        d="M80 160c14-10 28-10 40 0 12 10 26 10 40 0"
        stroke={innerStroke}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}
