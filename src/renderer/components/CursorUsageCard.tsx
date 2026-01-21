import { useState } from 'react'
import { UsageCard } from './UsageCard'
import { StatusIndicator } from './StatusIndicator'
import { SubscriptionBadge } from './SubscriptionBadge'
import { ProgressBar } from './ProgressBar'
import { RefreshButton } from './RefreshButton'
import { formatTime } from '../utils/formatters'
import type { UsageUpdate } from '../../types'

interface CursorUsageCardProps {
  data: UsageUpdate | null
  onRefresh?: () => Promise<void>
}

export function CursorUsageCard({ data, onRefresh }: CursorUsageCardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const cursor = data?.cursor || {} as Partial<UsageUpdate['cursor']>

  const getStatus = () => {
    if (!cursor.hasCredentials) return { status: 'error', text: 'No Token' }
    if (cursor.lastError) return { status: 'error', text: 'Error' }
    return { status: 'connected', text: 'Connected' }
  }

  const { status, text } = getStatus()

  // Convert cents to dollars for display
  const usedDollars = (cursor.usedRequests ?? 0) / 100
  const limitDollars = (cursor.limitRequests ?? 0) / 100

  // Total Usage: spent / limit
  const totalPercent = limitDollars > 0 ? Math.round((usedDollars / limitDollars) * 100) : 0

  // Estimated Usage with Bonus: spent / (limit * 2.5)
  const bonusLimit = limitDollars * 2.5
  const bonusPercent = bonusLimit > 0 ? Math.round((usedDollars / bonusLimit) * 100) : 0

  const handleRefresh = async () => {
    if (!onRefresh || isRefreshing) return
    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <UsageCard variant="cursor">
      <div className="flex justify-between items-start mb-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-medium text-white tracking-tight">Cursor Usage</h2>
            <RefreshButton onClick={handleRefresh} isRefreshing={isRefreshing} />
          </div>
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
          label="Total Usage"
          value={totalPercent}
          windowLabel={`$${usedDollars.toFixed(2)} / $${limitDollars.toFixed(2)}`}
          resetTime={cursor.billingCycleEnd}
          variant="cursor"
        />
        <ProgressBar
          label="Estimated Usage with Bonus"
          value={bonusPercent}
          windowLabel={`$${usedDollars.toFixed(2)} / $${bonusLimit.toFixed(2)}`}
          resetTime={cursor.billingCycleEnd}
          variant="cursor-secondary"
        />
      </div>
    </UsageCard>
  )
}
