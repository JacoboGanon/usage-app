import { useState, useEffect, useCallback } from 'react'
import type { RecentUsagesData, UsageChartData, UsageFilterMode, ProviderFilter, RecentUsageEntry } from '../../types/usage'
import { FilterBar, type ViewMode } from './FilterBar'
import { UsageCharts } from './UsageCharts'

const FILTER_MODE_STORAGE_KEY = 'usageConsole:recentUsagesFilterMode'
const PROVIDER_FILTER_STORAGE_KEY = 'usageConsole:recentUsagesProviderFilter'
const VIEW_MODE_STORAGE_KEY = 'usageConsole:viewMode'

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
  // Note: More specific patterns must come before general ones (e.g., opus-4-5 before opus-4)
  if (model.includes('claude-3-5-sonnet')) return 'Sonnet 3.5'
  if (model.includes('claude-3-opus')) return 'Opus 3'
  if (model.includes('claude-3-sonnet')) return 'Sonnet 3'
  if (model.includes('claude-3-haiku')) return 'Haiku 3'
  if (model.includes('claude-sonnet-4-5')) return 'Sonnet 4.5'
  if (model.includes('claude-sonnet-4')) return 'Sonnet 4'
  if (model.includes('claude-opus-4-5')) return 'Opus 4.5'
  if (model.includes('claude-opus-4')) return 'Opus 4'
  if (model.includes('claude-haiku-4')) return 'Haiku 4'
  if (model.includes('gpt-4o')) return 'GPT-4o'
  if (model.includes('gpt-4')) return 'GPT-4'
  if (model.includes('o1')) return 'o1'

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
      <td className="hidden lg:table-cell py-3 px-4 text-right">
        <span className="text-slate-300 text-sm font-mono">
          {formatTokens(entry.inputTokens + entry.cacheCreationTokens + entry.cacheReadTokens)}
        </span>
      </td>
      <td className="hidden lg:table-cell py-3 px-4 text-right">
        <span className="text-slate-300 text-sm font-mono">{formatTokens(entry.outputTokens)}</span>
      </td>
      <td className="hidden lg:table-cell py-3 px-4 text-right">
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
  return []
}

function storeProviderFilter(providers: ProviderFilter): void {
  try {
    localStorage.setItem(PROVIDER_FILTER_STORAGE_KEY, JSON.stringify(providers))
  } catch {
    // localStorage not available
  }
}

function getStoredViewMode(): ViewMode {
  try {
    const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY)
    if (stored === 'table' || stored === 'charts') {
      return stored
    }
  } catch {
    // localStorage not available
  }
  return 'table'
}

function storeViewMode(mode: ViewMode): void {
  try {
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode)
  } catch {
    // localStorage not available
  }
}

interface UsageDataPanelProps {
  className?: string
}

export function UsageDataPanel({ className = '' }: UsageDataPanelProps) {
  // Shared filter state
  const [filterMode, setFilterMode] = useState<UsageFilterMode>(getStoredFilterMode)
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>(getStoredProviderFilter)
  const [viewMode, setViewMode] = useState<ViewMode>(getStoredViewMode)

  // Table state
  const [tableData, setTableData] = useState<RecentUsagesData | null>(null)
  const [tableLoading, setTableLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)

  // Chart state
  const [chartData, setChartData] = useState<UsageChartData | null>(null)
  const [chartLoading, setChartLoading] = useState(true)

  const [error, setError] = useState<string | null>(null)

  // Fetch table data
  const fetchTableData = useCallback(async (page = currentPage, mode = filterMode, providers = providerFilter) => {
    try {
      if (!window.electronAPI?.usage?.getRecentUsages) {
        setError('API not available')
        setTableLoading(false)
        return
      }

      const result = await window.electronAPI.usage.getRecentUsages(page, PAGE_SIZE, mode, providers)
      setTableData(result)
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setTableLoading(false)
    }
  }, [currentPage, filterMode, providerFilter])

  // Fetch chart data
  const fetchChartData = useCallback(async (mode = filterMode, providers = providerFilter) => {
    try {
      if (!window.electronAPI?.usage?.getChartData) {
        console.error('[Charts] getChartData API not available')
        setChartLoading(false)
        return
      }

      const result = await window.electronAPI.usage.getChartData(mode, providers)
      setChartData(result)
    } catch (err) {
      console.error('[Charts] Failed to fetch chart data:', err)
    } finally {
      setChartLoading(false)
    }
  }, [filterMode, providerFilter])

  // Handle filter mode change
  const handleFilterModeChange = useCallback((mode: UsageFilterMode) => {
    setFilterMode(mode)
    storeFilterMode(mode)
    setCurrentPage(1)
    setTableLoading(true)
    setChartLoading(true)
    fetchTableData(1, mode, providerFilter)
    fetchChartData(mode, providerFilter)
  }, [fetchTableData, fetchChartData, providerFilter])

  // Handle provider filter change
  const handleProviderFilterChange = useCallback((providers: ProviderFilter) => {
    setProviderFilter(providers)
    storeProviderFilter(providers)
    setCurrentPage(1)
    setTableLoading(true)
    setChartLoading(true)
    fetchTableData(1, filterMode, providers)
    fetchChartData(filterMode, providers)
  }, [fetchTableData, fetchChartData, filterMode])

  // Handle view mode change
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode)
    storeViewMode(mode)
    // Fetch fresh data when switching views
    if (mode === 'charts') {
      setChartLoading(true)
      fetchChartData(filterMode, providerFilter)
    } else {
      setTableLoading(true)
      fetchTableData(currentPage, filterMode, providerFilter)
    }
  }, [fetchChartData, fetchTableData, currentPage, filterMode, providerFilter])

  // Handle page change
  const goToPage = useCallback((page: number) => {
    setCurrentPage(page)
    setTableLoading(true)
    fetchTableData(page, filterMode, providerFilter)
  }, [fetchTableData, filterMode, providerFilter])

  // Initial fetch and polling
  useEffect(() => {
    fetchTableData(currentPage, filterMode, providerFilter)
    fetchChartData(filterMode, providerFilter)

    // Refresh every 60 seconds
    const interval = setInterval(() => {
      fetchTableData(currentPage, filterMode, providerFilter)
      fetchChartData(filterMode, providerFilter)
    }, 60000)

    return () => clearInterval(interval)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const totalCost = viewMode === 'charts'
    ? (chartData?.totalCost ?? 0)
    : (tableData?.totalCost ?? 0)

  const isLoading = viewMode === 'charts' ? chartLoading : tableLoading

  if (isLoading && !tableData && !chartData) {
    return (
      <section className={`animate-scale-in ${className}`}>
        <FilterBar
          filterMode={filterMode}
          providerFilter={providerFilter}
          viewMode={viewMode}
          onFilterModeChange={handleFilterModeChange}
          onProviderFilterChange={handleProviderFilterChange}
          onViewModeChange={handleViewModeChange}
        />
        <div className="usage-card">
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-slate-400">
              <div className="w-5 h-5 border-2 border-slate-500 border-t-purple-500 rounded-full animate-spin" />
              <span>Loading usage data...</span>
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className={`animate-scale-in ${className}`}>
        <FilterBar
          filterMode={filterMode}
          providerFilter={providerFilter}
          viewMode={viewMode}
          onFilterModeChange={handleFilterModeChange}
          onProviderFilterChange={handleProviderFilterChange}
          onViewModeChange={handleViewModeChange}
        />
        <div className="usage-card">
          <div className="flex items-center justify-center py-12">
            <span className="text-red-400">{error}</span>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className={`animate-scale-in ${className}`}>
      <FilterBar
        filterMode={filterMode}
        providerFilter={providerFilter}
        viewMode={viewMode}
        onFilterModeChange={handleFilterModeChange}
        onProviderFilterChange={handleProviderFilterChange}
        onViewModeChange={handleViewModeChange}
      />

      {viewMode === 'charts' ? (
        <>
          {/* Charts Header */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-base font-medium text-white tracking-tight">Usage Analytics</h2>
              <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">
                Visual Breakdown
              </span>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {/* Session/Monthly Cost */}
              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-medium">
                  {filterMode === 'session' ? 'Session' : 'Monthly'} Cost
                </span>
                <span className="font-mono text-lg font-semibold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                  {formatCost(totalCost)}
                </span>
              </div>
              {/* Refresh button */}
              <button
                onClick={() => {
                  setChartLoading(true)
                  fetchChartData(filterMode, providerFilter)
                }}
                className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/5"
              >
                <svg className={`w-3.5 h-3.5 ${chartLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
          <UsageCharts
            entries={chartData?.entries ?? []}
            isLoading={chartLoading}
          />
        </>
      ) : (
        <div className="usage-card overflow-hidden">
          {/* Table Header */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-base font-medium text-white tracking-tight">Recent Usages</h2>
              <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">
                Token Usage & Costs
              </span>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {/* Session/Monthly Cost */}
              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-medium">
                  {filterMode === 'session' ? 'Session' : 'Monthly'} Cost
                </span>
                <span className="font-mono text-lg font-semibold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                  {formatCost(totalCost)}
                </span>
              </div>
              {/* Refresh button */}
              <button
                onClick={() => {
                  setTableLoading(true)
                  fetchTableData(currentPage, filterMode, providerFilter)
                }}
                className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/5"
              >
                <svg className={`w-3.5 h-3.5 ${tableLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>

          {/* Empty state */}
          {(!tableData || tableData.entries.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <span className="text-slate-400">
                {filterMode === 'session' ? 'No usage since app started' : 'No usage this month'}
              </span>
              <span className="text-slate-500 text-sm">
                Usage will appear here as you use Claude Code, Codex, or Cursor
              </span>
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="overflow-x-auto -mx-8 px-8">
                <table className="w-full min-w-[400px] lg:min-w-[600px]">
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
                      <th className="hidden lg:table-cell text-right py-3 px-4 text-[10px] text-slate-500 uppercase tracking-widest font-medium">
                        Input
                      </th>
                      <th className="hidden lg:table-cell text-right py-3 px-4 text-[10px] text-slate-500 uppercase tracking-widest font-medium">
                        Output
                      </th>
                      <th className="hidden lg:table-cell text-right py-3 px-4 text-[10px] text-slate-500 uppercase tracking-widest font-medium">
                        Cache
                      </th>
                      <th className="text-right py-3 px-4 text-[10px] text-slate-500 uppercase tracking-widest font-medium">
                        Cost
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.entries.map((entry) => (
                      <UsageRow key={entry.id} entry={entry} />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
                <span className="text-slate-500 text-xs">
                  Showing {((tableData.page - 1) * tableData.pageSize) + 1}-{Math.min(tableData.page * tableData.pageSize, tableData.totalCount)} of {tableData.totalCount} entries
                </span>

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
                    Page {tableData.page} of {tableData.totalPages}
                  </span>

                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage >= tableData.totalPages}
                    className="p-1.5 text-slate-400 hover:text-white disabled:text-slate-600 disabled:cursor-not-allowed transition-colors rounded hover:bg-white/5"
                    title="Next page"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  )
}
