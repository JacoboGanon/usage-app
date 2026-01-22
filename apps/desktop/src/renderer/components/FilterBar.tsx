import { useState, useRef, useEffect } from 'react'
import type { ProviderName, ProviderFilter, UsageFilterMode } from '../../types/usage'

export type ViewMode = 'table' | 'charts'

interface FilterBarProps {
  filterMode: UsageFilterMode
  providerFilter: ProviderFilter
  viewMode: ViewMode
  onFilterModeChange: (mode: UsageFilterMode) => void
  onProviderFilterChange: (providers: ProviderFilter) => void
  onViewModeChange: (mode: ViewMode) => void
  onResetSession?: () => void
}

const ALL_PROVIDERS: ProviderName[] = ['claude', 'codex', 'cursor']

const PROVIDER_CONFIG: Record<ProviderName, { label: string; color: string; bgColor: string }> = {
  claude: { label: 'Claude', color: 'text-purple-400', bgColor: 'bg-purple-500/20 border-purple-500/40' },
  codex: { label: 'Codex', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20 border-emerald-500/40' },
  cursor: { label: 'Cursor', color: 'text-sky-400', bgColor: 'bg-sky-500/20 border-sky-500/40' }
}

export function FilterBar({
  filterMode,
  providerFilter,
  viewMode,
  onFilterModeChange,
  onProviderFilterChange,
  onViewModeChange,
  onResetSession
}: FilterBarProps) {
  const [isProviderDropdownOpen, setIsProviderDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProviderDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isAllSelected = providerFilter.length === 0 || providerFilter.length === ALL_PROVIDERS.length
  const selectedCount = providerFilter.length === 0 ? ALL_PROVIDERS.length : providerFilter.length

  const isProviderSelected = (provider: ProviderName) => {
    return providerFilter.length === 0 || providerFilter.includes(provider)
  }

  const toggleProvider = (provider: ProviderName) => {
    if (providerFilter.length === 0) {
      onProviderFilterChange([provider])
    } else if (providerFilter.includes(provider)) {
      const newValue = providerFilter.filter(p => p !== provider)
      onProviderFilterChange(newValue.length === 0 ? ALL_PROVIDERS : newValue)
    } else {
      const newValue = [...providerFilter, provider]
      onProviderFilterChange(newValue.length === ALL_PROVIDERS.length ? [] : newValue)
    }
  }

  const toggleAll = () => {
    if (isAllSelected) {
      onProviderFilterChange(['claude'])
    } else {
      onProviderFilterChange([])
    }
  }

  const getProviderDisplayText = () => {
    if (isAllSelected) return 'All Providers'
    if (providerFilter.length === 1) return PROVIDER_CONFIG[providerFilter[0]].label
    return `${selectedCount} Providers`
  }

  return (
    <div className="filter-bar relative">
      {/* Decorative top accent */}
      <div className="absolute -top-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />

      <div className="flex items-center justify-between gap-4 p-4">
        {/* Left side: View Mode Toggle */}
        <div className="flex items-center h-10 gap-0.5 p-1 bg-slate-900/50 rounded-lg border border-white/5">
          <button
            onClick={() => onViewModeChange('table')}
            className={`flex items-center gap-1.5 h-full px-4 text-xs font-medium rounded-md transition-all duration-200 ${
              viewMode === 'table'
                ? 'bg-white/10 text-white'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Table
          </button>
          <button
            onClick={() => onViewModeChange('charts')}
            className={`flex items-center gap-1.5 h-full px-4 text-xs font-medium rounded-md transition-all duration-200 ${
              viewMode === 'charts'
                ? 'bg-white/10 text-white'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Charts
          </button>
        </div>

        {/* Center: Provider Filter Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsProviderDropdownOpen(!isProviderDropdownOpen)}
            className="inline-flex items-center gap-2 h-10 px-4 text-xs font-medium rounded-lg bg-slate-900/50 border border-white/5 text-slate-300 hover:bg-slate-800/50 hover:border-white/10 transition-all"
          >
            <div className="flex -space-x-1">
              {ALL_PROVIDERS.filter(p => isProviderSelected(p)).slice(0, 3).map(provider => (
                <div
                  key={provider}
                  className={`w-2 h-2 rounded-full border border-slate-900 ${
                    provider === 'claude' ? 'bg-purple-400' :
                    provider === 'codex' ? 'bg-emerald-400' : 'bg-sky-400'
                  }`}
                />
              ))}
            </div>
            <span>{getProviderDisplayText()}</span>
            <svg
              className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${isProviderDropdownOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isProviderDropdownOpen && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 min-w-[180px] py-1.5 bg-slate-900/98 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden">
              {/* All Providers option */}
              <button
                onClick={toggleAll}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-xs hover:bg-white/5 transition-colors"
              >
                <span
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                    isAllSelected
                      ? 'bg-gradient-to-br from-purple-500 to-violet-600 border-purple-400'
                      : 'border-slate-600 hover:border-slate-500'
                  }`}
                >
                  {isAllSelected && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <span className={`font-medium ${isAllSelected ? 'text-white' : 'text-slate-400'}`}>All Providers</span>
              </button>

              <div className="h-px bg-white/5 mx-2 my-1" />

              {/* Individual providers */}
              {ALL_PROVIDERS.map(provider => {
                const config = PROVIDER_CONFIG[provider]
                const isSelected = isProviderSelected(provider)
                const checkboxColors = {
                  claude: 'from-purple-500 to-purple-600 border-purple-400',
                  codex: 'from-emerald-500 to-emerald-600 border-emerald-400',
                  cursor: 'from-sky-500 to-sky-600 border-sky-400'
                }

                return (
                  <button
                    key={provider}
                    onClick={() => toggleProvider(provider)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-xs hover:bg-white/5 transition-colors"
                  >
                    <span
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                        isSelected
                          ? `bg-gradient-to-br ${checkboxColors[provider]}`
                          : 'border-slate-600 hover:border-slate-500'
                      }`}
                    >
                      {isSelected && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    <span className={`font-medium ${isSelected ? config.color : 'text-slate-500'}`}>
                      {config.label}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Right side: Time Period Toggle + Reset */}
        <div className="flex items-center gap-2">
          <div className="flex items-center h-10 gap-0.5 p-1 bg-slate-900/50 rounded-lg border border-white/5">
            <button
              onClick={() => onFilterModeChange('session')}
              className={`h-full px-4 text-xs font-medium rounded-md transition-all duration-200 ${
                filterMode === 'session'
                  ? 'bg-gradient-to-r from-purple-500/30 to-violet-500/30 text-purple-200 shadow-sm shadow-purple-500/20'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Session
            </button>
            <button
              onClick={() => onFilterModeChange('monthly')}
              className={`h-full px-4 text-xs font-medium rounded-md transition-all duration-200 ${
                filterMode === 'monthly'
                  ? 'bg-gradient-to-r from-purple-500/30 to-violet-500/30 text-purple-200 shadow-sm shadow-purple-500/20'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Monthly
            </button>
          </div>
          {filterMode === 'session' && onResetSession && (
            <button
              onClick={onResetSession}
              className="flex items-center gap-1.5 h-10 px-3 text-xs font-medium rounded-lg bg-slate-900/50 border border-white/5 text-slate-400 hover:text-white hover:bg-slate-800/50 hover:border-white/10 transition-all"
              title="Reset session cost tracking"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Decorative bottom border */}
      <div className="absolute -bottom-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  )
}
