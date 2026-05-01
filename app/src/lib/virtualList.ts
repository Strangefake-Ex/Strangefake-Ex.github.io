export function computeVirtualRange(input: {
  scrollTop: number
  itemHeight: number
  viewportHeight: number
  overscan: number
  total: number
}) {
  const { scrollTop, itemHeight, viewportHeight, overscan, total } = input
  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const end = Math.min(total, Math.ceil((scrollTop + viewportHeight) / itemHeight) + overscan)
  return { start, end }
}

