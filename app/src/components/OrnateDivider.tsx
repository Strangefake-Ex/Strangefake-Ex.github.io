export default function OrnateDivider({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 840 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <path d="M24 20h260" stroke="rgba(185,144,46,0.26)" strokeWidth="2" strokeLinecap="round" />
      <path d="M556 20h260" stroke="rgba(185,144,46,0.26)" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M420 6c10 0 18 6 18 14s-8 14-18 14-18-6-18-14 8-14 18-14Z"
        stroke="rgba(185,144,46,0.34)"
        strokeWidth="2"
      />
      <path
        d="M420 10c7 0 12 4 12 10s-5 10-12 10-12-4-12-10 5-10 12-10Z"
        stroke="rgba(185,144,46,0.22)"
        strokeWidth="2"
      />
      <path
        d="M420 14l4 6-4 6-4-6 4-6Z"
        fill="rgba(224,192,106,0.35)"
        stroke="rgba(185,144,46,0.26)"
        strokeWidth="1.5"
      />
      <path
        d="M300 20c20-14 38-14 58 0 20 14 38 14 58 0"
        stroke="rgba(185,144,46,0.20)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M540 20c-20-14-38-14-58 0-20 14-38 14-58 0"
        stroke="rgba(185,144,46,0.20)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

