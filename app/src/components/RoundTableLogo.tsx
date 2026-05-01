export default function RoundTableLogo({
  className,
  ariaLabel = 'The Round Table',
}: {
  className?: string
  ariaLabel?: string
}) {
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
        <linearGradient id="rt-logo-gold" x1="36" y1="36" x2="204" y2="204" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f4dda0" stopOpacity="0.95" />
          <stop offset="0.38" stopColor="#d7b25a" stopOpacity="0.85" />
          <stop offset="1" stopColor="#9f7520" stopOpacity="0.82" />
        </linearGradient>
        <radialGradient id="rt-logo-ink" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(120 120) rotate(90) scale(118)">
          <stop stopColor="rgba(20,17,15,0.10)" />
          <stop offset="0.55" stopColor="rgba(20,17,15,0.05)" />
          <stop offset="1" stopColor="rgba(20,17,15,0)" />
        </radialGradient>
      </defs>

      <circle cx="120" cy="120" r="112" fill="url(#rt-logo-ink)" stroke="url(#rt-logo-gold)" strokeOpacity="0.34" strokeWidth="2" />
      <circle cx="120" cy="120" r="96" stroke="url(#rt-logo-gold)" strokeOpacity="0.18" strokeWidth="2" strokeDasharray="2 11" />

      <path
        d="M120 72c18 0 34 6 44 16 10 10 16 26 16 44s-6 34-16 44c-10 10-26 16-44 16s-34-6-44-16c-10-10-16-26-16-44s6-34 16-44c10-10 26-16 44-16Z"
        stroke="rgba(185,144,46,0.22)"
        strokeWidth="2"
      />

      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2
        const x = 120 + Math.cos(a) * 70
        const y = 120 + Math.sin(a) * 70
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="8.5" fill="rgba(246,237,215,0.85)" stroke="rgba(185,144,46,0.30)" strokeWidth="2" />
            <circle cx={x} cy={y} r="2.2" fill="rgba(185,144,46,0.30)" />
          </g>
        )
      })}

      <path
        d="M120 98c10 0 18 8 18 18s-8 18-18 18-18-8-18-18 8-18 18-18Z"
        fill="rgba(246,237,215,0.72)"
        stroke="rgba(185,144,46,0.26)"
        strokeWidth="2"
      />
      <path
        d="M120 105l4 7-4 7-4-7 4-7Z"
        fill="rgba(185,144,46,0.26)"
        stroke="rgba(185,144,46,0.26)"
        strokeWidth="1.6"
      />
      <path
        d="M80 160c14-10 28-10 40 0 12 10 26 10 40 0"
        stroke="rgba(185,144,46,0.22)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

