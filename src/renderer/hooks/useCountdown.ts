import { useState, useEffect } from 'react'
import { formatTimeRemaining } from '../utils/formatters'

export function useCountdown(resetTime: string | null | undefined): string {
  const [countdown, setCountdown] = useState(() => formatTimeRemaining(resetTime))

  useEffect(() => {
    setCountdown(formatTimeRemaining(resetTime))

    const interval = setInterval(() => {
      setCountdown(formatTimeRemaining(resetTime))
    }, 1000)

    return () => clearInterval(interval)
  }, [resetTime])

  return countdown
}
