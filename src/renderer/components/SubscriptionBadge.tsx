interface SubscriptionBadgeProps {
  plan: string | undefined
  variant?: 'claude' | 'codex' | 'cursor'
}

export function SubscriptionBadge({ plan, variant = 'claude' }: SubscriptionBadgeProps) {
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

  return (
    <div className={`subscription-badge ${badgeClass} px-4 py-1 bg-gradient-to-br ${gradientClass} rounded-full relative overflow-hidden`}>
      <span className={`badge-text relative font-mono text-xs font-semibold uppercase tracking-widest bg-gradient-to-br ${gradientClass} bg-clip-text text-transparent`}>
        {plan || '---'}
      </span>
    </div>
  )
}
