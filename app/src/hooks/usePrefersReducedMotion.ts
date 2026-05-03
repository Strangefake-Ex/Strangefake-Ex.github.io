import { useEffect, useState } from 'react'

export default function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    if (!window.matchMedia) return
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return reduced
}
