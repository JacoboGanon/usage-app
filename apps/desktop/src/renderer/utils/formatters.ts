export function formatTimeRemaining(isoString: string | null | undefined): string {
  if (!isoString) return '--:--:--'

  const resetTime = new Date(isoString)
  const now = new Date()
  const diff = resetTime.getTime() - now.getTime()

  if (diff <= 0) return '00:00:00'

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export function formatTime(isoString: string | null | undefined): string {
  if (!isoString) return '--:--:--'
  const date = new Date(isoString)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

export function formatWindowLabel(seconds: number | null | undefined): string {
  if (!seconds) return '--'
  if (seconds % 86400 === 0) {
    const days = seconds / 86400
    return `${days}d rolling`
  }
  if (seconds % 3600 === 0) {
    const hours = seconds / 3600
    return `${hours}h rolling`
  }
  const minutes = Math.round(seconds / 60)
  return `${minutes}m rolling`
}
