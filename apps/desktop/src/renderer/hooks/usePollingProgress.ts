import { useState, useEffect, useRef } from 'react'

export function usePollingProgress(pollStartTime: number, pollIntervalMs: number): number {
  const [progress, setProgress] = useState(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const animate = () => {
      const elapsed = Date.now() - pollStartTime
      const interval = Math.max(pollIntervalMs, 1000)
      const newProgress = Math.min((elapsed / interval) * 100, 100)
      setProgress(newProgress)
      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [pollStartTime, pollIntervalMs])

  return progress
}
