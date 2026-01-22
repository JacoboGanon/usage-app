interface SubscriptionBadgeProps {
  plan: string | undefined
  multiplier?: string | null
  variant?: 'claude' | 'codex' | 'cursor'
}

/**
 * Extracts the multiplier (e.g., "5x", "20x") from a rateLimitTier string
 * Example: "default_claude_max_20x" → "20x"
 */
export function extractMultiplier(rateLimitTier: string | null | undefined): string | null {
  if (!rateLimitTier) return null
  const match = rateLimitTier.match(/(\d+x)$/i)
  return match ? match[1].toUpperCase() : null
}

export function SubscriptionBadge({ plan, multiplier, variant = 'claude' }: SubscriptionBadgeProps) {
  const gradientClass = variant === 'codex'
    ? 'from-emerald-400 to-lime-400'
    : variant === 'cursor'
    ? 'from-orange-400 to-amber-400'
    : 'from-accent-1 via-accent-2 to-accent-3'

  const badgeClass = variant === 'codex'
    ? 'codex-badge'
    : variant === 'cursor'
    ? 'cursor-badge'
    : ''

  const displayText = multiplier ? `${plan || '---'} ${multiplier}` : (plan || '---')

  return (
    <div className={`subscription-badge ${badgeClass} px-4 py-1 bg-gradient-to-br ${gradientClass} rounded-full relative overflow-hidden`}>
      <span className={`badge-text relative font-mono text-xs font-semibold uppercase tracking-widest bg-gradient-to-br ${gradientClass} bg-clip-text text-transparent`}>
        {displayText}
      </span>
    </div>
  )
}
