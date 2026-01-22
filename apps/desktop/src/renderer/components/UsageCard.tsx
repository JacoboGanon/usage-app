import type { ReactNode } from 'react'

interface UsageCardProps {
  children: ReactNode
  variant?: 'claude' | 'codex' | 'cursor'
  className?: string
}

export function UsageCard({ children, variant = 'claude', className = '' }: UsageCardProps) {
  const cardClass = variant === 'codex'
    ? 'codex-card'
    : variant === 'cursor'
    ? 'cursor-card'
    : 'claude-card'
  const animationClass = variant === 'codex'
    ? 'animate-slide-in-right'
    : variant === 'cursor'
    ? 'animate-scale-in'
    : 'animate-slide-in-left'

  return (
    <section className={`usage-card ${cardClass} ${animationClass} ${className}`}>
      {children}
    </section>
  )
}
