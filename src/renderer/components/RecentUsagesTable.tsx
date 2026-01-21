import { useState, useEffect, useCallback } from 'react'
import type { RecentUsagesData, RecentUsageEntry, UsageFilterMode, ProviderFilter } from '../../types/usage'
import { ProviderFilterDropdown } from './ProviderFilterDropdown'

const FILTER_MODE_STORAGE_KEY = 'usageConsole:recentUsagesFilterMode'
const PROVIDER_FILTER_STORAGE_KEY = 'usageConsole:recentUsagesProviderFilter'

interface RecentUsagesTableProps {
  className?: string
}

function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${cost.toFixed(6)}`
  }
  return `$${cost.toFixed(4)}`
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(2)}M`
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`
  }
  return tokens.toString()
}

function formatTimestamp(timestamp: Date | string): string {
  // Handle both Date objects and ISO strings (from IPC serialization)
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatModel(model: string): string {
  // Shorten common model names
  if (model.includes('claude-3-5-sonnet')) return 'Sonnet 3.5'
  if (model.includes('claude-3-opus')) return 'Opus 3'
  if (model.includes('claude-3-sonnet')) return 'Sonnet 3'
  if (model.includes('claude-3-haiku')) return 'Haiku 3'
  if (model.includes('claude-sonnet-4')) return 'Sonnet 4'
  if (model.includes('claude-opus-4')) return 'Opus 4'
  if (model.includes('gpt-4o')) return 'GPT-4o'
  if (model.includes('gpt-4')) return 'GPT-4'
  if (model.includes('o1')) return 'o1'

  // Return last part if too long
  if (model.length > 20) {
    const parts = model.split('-')
    return parts.slice(-2).join('-')
  }

  return model
}

function ProviderBadge({ provider }: { provider: 'claude' | 'codex' | 'cursor' }) {
  const styles = {
    claude: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
    codex: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    cursor: 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
  }

  const labels = {
    claude: 'Claude',
    codex: 'Codex',
    cursor: 'Cursor'
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${styles[provider]}`}
    >
      {labels[provider]}
    </span>
  )
}

function UsageRow({ entry }: { entry: RecentUsageEntry }) {
  return (
    <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
      <td className="py-3 px-4">
        <div className="flex flex-col gap-1">
          <span className="text-slate-300 text-sm">{formatTimestamp(entry.timestamp)}</span>
          {entry.projectName && (
            <span className="text-slate-500 text-xs font-mono truncate max-w-[120px]" title={entry.projectName}>
              {entry.projectName}
            </span>
          )}
        </div>
      </td>
      <td className="py-3 px-4">
        <ProviderBadge provider={entry.provider} />
      </td>
      <td className="py-3 px-4">
        <span className="text-slate-400 text-sm font-mono">{formatModel(entry.model)}</span>
      </td>
      <td className="py-3 px-4 text-right">
        <span className="text-slate-300 text-sm font-mono">
          {formatTokens(entry.inputTokens + entry.cacheCreationTokens + entry.cacheReadTokens)}
        </span>
      </td>
      <td className="py-3 px-4 text-right">
        <span className="text-slate-300 text-sm font-mono">{formatTokens(entry.outputTokens)}</span>
      </td>
      <td className="py-3 px-4 text-right">
        {(entry.cacheCreationTokens > 0 || entry.cacheReadTokens > 0) ? (
          <span className="text-cyan-400 text-sm font-mono">
            {formatTokens(entry.cacheReadTokens)}
          </span>
        ) : (
          <span className="text-slate-600 text-sm">-</span>
        )}
      </td>
      <td className="py-3 px-4 text-right">
        <span className={`text-sm font-mono ${entry.cost > 0.01 ? 'text-amber-400' : 'text-slate-400'}`}>
          {formatCost(entry.cost)}
        </span>
      </td>
    </tr>
  )
}

const PAGE_SIZE = 50

function getStoredFilterMode(): UsageFilterMode {
  try {
    const stored = localStorage.getItem(FILTER_MODE_STORAGE_KEY)
    if (stored === 'session' || stored === 'monthly') {
      return stored
    }
  } catch {
    // localStorage not available
  }
  return 'session'
}

function storeFilterMode(mode: UsageFilterMode): void {
  try {
    localStorage.setItem(FILTER_MODE_STORAGE_KEY, mode)
  } catch {
    // localStorage not available
  }
}

function getStoredProviderFilter(): ProviderFilter {
  try {
    const stored = localStorage.getItem(PROVIDER_FILTER_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        return parsed.filter(p => ['claude', 'codex', 'cursor'].includes(p))
      }
    }
  } catch {
    // localStorage not available or invalid JSON
  }
  return [] // Empty array means "all providers"
}

function storeProviderFilter(providers: ProviderFilter): void {
  try {
    localStorage.setItem(PROVIDER_FILTER_STORAGE_KEY, JSON.stringify(providers))
  } catch {
    // localStorage not available
  }
}

export function RecentUsagesTable({ className = '' }: RecentUsagesTableProps) {
  const [data, setData] = useState<RecentUsagesData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [filterMode, setFilterMode] = useState<UsageFilterMode>(getStoredFilterMode)
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>(getStoredProviderFilter)

  const fetchData = useCallback(async (page = currentPage, mode = filterMode, providers = providerFilter) => {
    try {
      if (!window.electronAPI?.usage?.getRecentUsages) {
        setError('API not available')
        setIsLoading(false)
        return
      }

      const result = await window.electronAPI.usage.getRecentUsages(page, PAGE_SIZE, mode, providers)
      setData(result)
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, filterMode, providerFilter])

  const goToPage = useCallback((page: number) => {
    setCurrentPage(page)
    setIsLoading(true)
    fetchData(page, filterMode, providerFilter)
  }, [fetchData, filterMode, providerFilter])

  const handleFilterModeChange = useCallback((mode: UsageFilterMode) => {
    setFilterMode(mode)
    storeFilterMode(mode)
    setCurrentPage(1)
    setIsLoading(true)
    fetchData(1, mode, providerFilter)
  }, [fetchData, providerFilter])

  const handleProviderFilterChange = useCallback((providers: ProviderFilter) => {
    setProviderFilter(providers)
    storeProviderFilter(providers)
    setCurrentPage(1)
    setIsLoading(true)
    fetchData(1, filterMode, providers)
  }, [fetchData, filterMode])

  useEffect(() => {
    fetchData(currentPage, filterMode, providerFilter)

    // Refresh every 60 seconds
    const interval = setInterval(() => fetchData(currentPage, filterMode, providerFilter), 60000)
    return () => clearInterval(interval)
  }, [fetchData, currentPage, filterMode, providerFilter])

  if (isLoading) {
    return (
      <section className={`usage-card animate-scale-in ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-slate-400">
            <div className="w-5 h-5 border-2 border-slate-500 border-t-purple-500 rounded-full animate-spin" />
            <span>Loading recent usages...</span>
          </div>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className={`usage-card animate-scale-in ${className}`}>
        <div className="flex items-center justify-center py-12">
          <span className="text-red-400">{error}</span>
        </div>
      </section>
    )
  }

  if (!data || data.entries.length === 0) {
    return (
      <section className={`usage-card animate-scale-in ${className}`}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-medium text-white tracking-tight">Recent Usages</h2>
            <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">
              Token Usage & Costs
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Provider Filter */}
            <ProviderFilterDropdown value={providerFilter} onChange={handleProviderFilterChange} />

            {/* Filter Mode Toggle */}
            <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg border border-white/10">
              <button
                onClick={() => handleFilterModeChange('session')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  filterMode === 'session'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'text-slate-400 hover:text-slate-300 hover:bg-white/5'
                }`}
              >
                Session
              </button>
              <button
                onClick={() => handleFilterModeChange('monthly')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  filterMode === 'monthly'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'text-slate-400 hover:text-slate-300 hover:bg-white/5'
                }`}
              >
                Monthly
              </button>
            </div>
          </div>

          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">
              {filterMode === 'session' ? 'Session Cost' : 'Monthly Cost'}
            </span>
            <span className="font-mono text-lg text-amber-400 font-semibold">
              $0.0000
            </span>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <span className="text-slate-400">
            {filterMode === 'session' ? 'No usage since app started' : 'No usage this month'}
          </span>
          <span className="text-slate-500 text-sm">
            Usage will appear here as you use Claude Code, Codex, or Cursor
          </span>
        </div>
      </section>
    )
  }

  return (
    <section className={`usage-card animate-scale-in overflow-hidden ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-medium text-white tracking-tight">Recent Usages</h2>
          <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">
            Token Usage & Costs
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Provider Filter */}
          <ProviderFilterDropdown value={providerFilter} onChange={handleProviderFilterChange} />

          {/* Filter Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg border border-white/10">
            <button
              onClick={() => handleFilterModeChange('session')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                filterMode === 'session'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'text-slate-400 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              Session
            </button>
            <button
              onClick={() => handleFilterModeChange('monthly')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                filterMode === 'monthly'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'text-slate-400 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>

        <div className="flex flex-col items-end gap-0.5">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest">
            {filterMode === 'session' ? 'Session Cost' : 'Monthly Cost'}
          </span>
          <span className="font-mono text-lg text-amber-400 font-semibold">
            {formatCost(data.totalCost)}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto -mx-8 px-8">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 text-[10px] text-slate-500 uppercase tracking-widest font-medium">
                Time
              </th>
              <th className="text-left py-3 px-4 text-[10px] text-slate-500 uppercase tracking-widest font-medium">
                Provider
              </th>
              <th className="text-left py-3 px-4 text-[10px] text-slate-500 uppercase tracking-widest font-medium">
                Model
              </th>
              <th className="text-right py-3 px-4 text-[10px] text-slate-500 uppercase tracking-widest font-medium">
                Input
              </th>
              <th className="text-right py-3 px-4 text-[10px] text-slate-500 uppercase tracking-widest font-medium">
                Output
              </th>
              <th className="text-right py-3 px-4 text-[10px] text-slate-500 uppercase tracking-widest font-medium">
                Cache
              </th>
              <th className="text-right py-3 px-4 text-[10px] text-slate-500 uppercase tracking-widest font-medium">
                Cost
              </th>
            </tr>
          </thead>
          <tbody>
            {data.entries.map((entry) => (
              <UsageRow key={entry.id} entry={entry} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
        <span className="text-slate-500 text-xs">
          Showing {((data.page - 1) * data.pageSize) + 1}-{Math.min(data.page * data.pageSize, data.totalCount)} of {data.totalCount} entries
        </span>

        <div className="flex items-center gap-3">
          {/* Pagination controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1.5 text-slate-400 hover:text-white disabled:text-slate-600 disabled:cursor-not-allowed transition-colors rounded hover:bg-white/5"
              title="Previous page"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <span className="text-xs text-slate-400 px-2 min-w-[80px] text-center">
              Page {data.page} of {data.totalPages}
            </span>

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= data.totalPages}
              className="p-1.5 text-slate-400 hover:text-white disabled:text-slate-600 disabled:cursor-not-allowed transition-colors rounded hover:bg-white/5"
              title="Next page"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Refresh button */}
          <button
            onClick={() => fetchData(currentPage, filterMode, providerFilter)}
            className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>
    </section>
  )
}
