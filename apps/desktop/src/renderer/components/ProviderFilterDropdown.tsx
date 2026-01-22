import { useState, useRef, useEffect } from 'react'
import type { ProviderName, ProviderFilter } from '../../types/usage'

interface ProviderFilterDropdownProps {
  value: ProviderFilter
  onChange: (providers: ProviderFilter) => void
}

const ALL_PROVIDERS: ProviderName[] = ['claude', 'codex', 'cursor']

const PROVIDER_CONFIG: Record<ProviderName, { label: string; color: string }> = {
  claude: { label: 'Claude', color: 'purple' },
  codex: { label: 'Codex', color: 'emerald' },
  cursor: { label: 'Cursor', color: 'sky' }
}

export function ProviderFilterDropdown({ value, onChange }: ProviderFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isAllSelected = value.length === ALL_PROVIDERS.length || value.length === 0
  const selectedCount = value.length === 0 ? ALL_PROVIDERS.length : value.length

  const toggleProvider = (provider: ProviderName) => {
    if (value.length === 0) {
      // Currently "all" selected, switch to single provider
      onChange([provider])
    } else if (value.includes(provider)) {
      // Remove provider (but keep at least one)
      const newValue = value.filter(p => p !== provider)
      onChange(newValue.length === 0 ? ALL_PROVIDERS : newValue)
    } else {
      // Add provider
      const newValue = [...value, provider]
      // If all providers selected, switch to empty array (meaning "all")
      onChange(newValue.length === ALL_PROVIDERS.length ? [] : newValue)
    }
  }

  const toggleAll = () => {
    if (isAllSelected) {
      // Select only the first provider
      onChange(['claude'])
    } else {
      // Select all
      onChange([])
    }
  }

  const isProviderSelected = (provider: ProviderName) => {
    return value.length === 0 || value.includes(provider)
  }

  const getDisplayText = () => {
    if (isAllSelected) return 'All Providers'
    if (value.length === 1) return PROVIDER_CONFIG[value[0]].label
    return `${selectedCount} Providers`
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2.5 text-xs font-medium rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20 transition-all"
      >
        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <span>{getDisplayText()}</span>
        <svg
          className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-[160px] py-1 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-xl">
          {/* All option */}
          <button
            onClick={toggleAll}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs hover:bg-white/5 transition-colors"
          >
            <span
              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                isAllSelected
                  ? 'bg-purple-500/20 border-purple-500/50'
                  : 'border-white/20'
              }`}
            >
              {isAllSelected && (
                <svg className="w-3 h-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
            <span className={isAllSelected ? 'text-white' : 'text-slate-400'}>All Providers</span>
          </button>

          <div className="h-px bg-white/5 mx-2 my-1" />

          {/* Individual providers */}
          {ALL_PROVIDERS.map(provider => {
            const config = PROVIDER_CONFIG[provider]
            const isSelected = isProviderSelected(provider)
            const colorClasses = {
              purple: 'bg-purple-500/20 border-purple-500/50 text-purple-400',
              emerald: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400',
              sky: 'bg-sky-500/20 border-sky-500/50 text-sky-400'
            }

            return (
              <button
                key={provider}
                onClick={() => toggleProvider(provider)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs hover:bg-white/5 transition-colors"
              >
                <span
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    isSelected
                      ? colorClasses[config.color as keyof typeof colorClasses]
                      : 'border-white/20'
                  }`}
                >
                  {isSelected && (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <span className={isSelected ? 'text-white' : 'text-slate-400'}>{config.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
