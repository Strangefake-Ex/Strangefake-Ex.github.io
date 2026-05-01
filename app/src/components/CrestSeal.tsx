export default function CrestSeal({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="rt-gold" x1="32" y1="32" x2="208" y2="208" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f0d38a" stopOpacity="0.9" />
          <stop offset="0.35" stopColor="#d7b25a" stopOpacity="0.75" />
          <stop offset="1" stopColor="#b8943a" stopOpacity="0.7" />
        </linearGradient>
        <radialGradient id="rt-ember" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(120 120) rotate(90) scale(120)">
          <stop stopColor="#f0d38a" stopOpacity="0.12" />
          <stop offset="0.55" stopColor="#d7b25a" stopOpacity="0.05" />
          <stop offset="1" stopColor="#07070a" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="120" cy="120" r="118" stroke="url(#rt-gold)" strokeOpacity="0.28" strokeWidth="2" />
      <circle cx="120" cy="120" r="104" stroke="url(#rt-gold)" strokeOpacity="0.16" strokeWidth="2" strokeDasharray="2 10" />
      <circle cx="120" cy="120" r="84" fill="url(#rt-ember)" />

      <path
        d="M120 52l14 22 25 6-16 20 2 26-25-10-25 10 2-26-16-20 25-6 14-22z"
        stroke="url(#rt-gold)"
        strokeOpacity="0.4"
        strokeWidth="2"
      />

      <path
        d="M120 72v96"
        stroke="url(#rt-gold)"
        strokeOpacity="0.22"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M72 120h96"
        stroke="url(#rt-gold)"
        strokeOpacity="0.18"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <path
        d="M120 92c10 0 18 7 18 16 0 6-3 11-8 14 8 2 14 9 14 18 0 11-10 20-24 20s-24-9-24-20c0-9 6-16 14-18-5-3-8-8-8-14 0-9 8-16 18-16z"
        stroke="url(#rt-gold)"
        strokeOpacity="0.32"
        strokeWidth="2"
      />

      <g opacity="0.22" stroke="url(#rt-gold)" strokeWidth="1.4">
        <path d="M120 26c-52 0-94 42-94 94s42 94 94 94 94-42 94-94" />
        <path d="M120 214c52 0 94-42 94-94" />
      </g>
    </svg>
  )
}

