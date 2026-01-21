import { UsageCard } from './UsageCard'
import { StatusIndicator } from './StatusIndicator'
import { SubscriptionBadge } from './SubscriptionBadge'
import { ProgressBar } from './ProgressBar'
import { formatTime } from '../utils/formatters'
import type { UsageUpdate } from '../../types'

interface ClaudeUsageCardProps {
  data: UsageUpdate | null
}

export function ClaudeUsageCard({ data }: ClaudeUsageCardProps) {
  const claude = data?.claude || {} as Partial<UsageUpdate['claude']>

  const getStatus = () => {
    if (!claude.hasCredentials) return { status: 'error', text: 'No Credentials' }
    if (claude.lastError) return { status: 'error', text: 'Error' }
    return { status: 'connected', text: 'Connected' }
  }

  const { status, text } = getStatus()
  const sessionPercent = Math.round((claude.sessionUsagePercent || 0) * 100)
  const weeklyPercent = Math.round((claude.weeklyUsagePercent || 0) * 100)

  return (
    <UsageCard variant="claude">
      <div className="flex justify-between items-start mb-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-medium text-white tracking-tight">Claude Usage</h2>
          <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">Claude Code</span>
        </div>
        <SubscriptionBadge plan={claude.subscriptionType} variant="claude" />
      </div>

      <div className="flex justify-between items-center mb-6">
        <StatusIndicator status={status} text={text} />
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest">Last sync</span>
          <span className="update-time font-mono text-sm text-slate-400">{formatTime(claude.lastUpdated)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <ProgressBar
          label="Session window"
          value={sessionPercent}
          windowLabel="5h rolling"
          resetTime={claude.sessionResetTime}
          variant="claude"
        />
        <ProgressBar
          label="Weekly capacity"
          value={weeklyPercent}
          windowLabel="7d rolling"
          resetTime={claude.weeklyResetTime}
          variant="claude"
          showGlow={true}
        />
      </div>
    </UsageCard>
  )
}
