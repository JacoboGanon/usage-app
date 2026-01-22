import { useState } from 'react'
import { UsageCard } from './UsageCard'
import { StatusIndicator } from './StatusIndicator'
import { SubscriptionBadge } from './SubscriptionBadge'
import { ProgressBar } from './ProgressBar'
import { RefreshButton } from './RefreshButton'
import { formatTime, formatWindowLabel } from '../utils/formatters'
import type { UsageUpdate } from '../../types'

interface CodexUsageCardProps {
  data: UsageUpdate | null
  onRefresh?: () => Promise<void>
}

export function CodexUsageCard({ data, onRefresh }: CodexUsageCardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const codex = data?.codex || {} as Partial<UsageUpdate['codex']>

  const getStatus = () => {
    if (!codex.hasCredentials) return { status: 'error', text: 'No Credentials' }
    if (codex.lastError) return { status: 'error', text: 'Error' }
    return { status: 'connected', text: 'Connected' }
  }

  const { status, text } = getStatus()
  const primaryPercent = Math.round(codex.primaryUsedPercent || 0)
  const secondaryPercent = Math.round(codex.secondaryUsedPercent || 0)

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
    <UsageCard variant="codex">
      <div className="flex justify-between items-start mb-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-medium text-white tracking-tight">Codex Usage</h2>
            <RefreshButton onClick={handleRefresh} isRefreshing={isRefreshing} />
          </div>
          <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">OpenAI Codex</span>
        </div>
        <SubscriptionBadge plan={codex.planType} variant="codex" />
      </div>

      <div className="flex justify-between items-center mb-6">
        <StatusIndicator status={status} text={text} />
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest">Last sync</span>
          <span className="update-time font-mono text-sm text-slate-400">{formatTime(codex.lastUpdated)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-6 mt-4">
        <ProgressBar
          label="Primary window"
          value={primaryPercent}
          windowLabel={formatWindowLabel(codex.primaryWindowSeconds)}
          resetTime={codex.primaryResetTime}
          variant="codex"
        />
        <ProgressBar
          label="Secondary window"
          value={secondaryPercent}
          windowLabel={formatWindowLabel(codex.secondaryWindowSeconds)}
          resetTime={codex.secondaryResetTime}
          variant="codex-secondary"
        />
      </div>
    </UsageCard>
  )
}
