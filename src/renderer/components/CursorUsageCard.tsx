import { UsageCard } from './UsageCard'
import { StatusIndicator } from './StatusIndicator'
import { SubscriptionBadge } from './SubscriptionBadge'
import { ProgressBar } from './ProgressBar'
import { formatTime } from '../utils/formatters'
import type { UsageUpdate } from '../../types'

interface CursorUsageCardProps {
  data: UsageUpdate | null
}

export function CursorUsageCard({ data }: CursorUsageCardProps) {
  const cursor = data?.cursor || {} as Partial<UsageUpdate['cursor']>

  const getStatus = () => {
    if (!cursor.hasCredentials) return { status: 'error', text: 'No Token' }
    if (cursor.lastError) return { status: 'error', text: 'Error' }
    return { status: 'connected', text: 'Connected' }
  }

  const { status, text } = getStatus()
  const totalPercent = Math.round(cursor.totalUsagePercent || 0)
  const apiPercent = Math.round(cursor.apiUsagePercent || 0)

  return (
    <UsageCard variant="cursor">
      <div className="flex justify-between items-start mb-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-medium text-white tracking-tight">Cursor Usage</h2>
          <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">AI Code Editor</span>
        </div>
        <SubscriptionBadge plan={cursor.membershipType} variant="cursor" />
      </div>

      <div className="flex justify-between items-center mb-6">
        <StatusIndicator status={status} text={text} />
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest">Last sync</span>
          <span className="update-time font-mono text-sm text-slate-400">{formatTime(cursor.lastUpdated)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-6 mt-4">
        <ProgressBar
          label="Total usage"
          value={totalPercent}
          windowLabel={`${cursor.usedRequests ?? 0} / ${cursor.limitRequests ?? 0} requests`}
          resetTime={cursor.billingCycleEnd}
          variant="cursor"
        />
        <ProgressBar
          label="API usage"
          value={apiPercent}
          windowLabel={`${cursor.remainingRequests ?? 0} remaining`}
          resetTime={cursor.billingCycleEnd}
          variant="cursor-secondary"
        />
      </div>
    </UsageCard>
  )
}
