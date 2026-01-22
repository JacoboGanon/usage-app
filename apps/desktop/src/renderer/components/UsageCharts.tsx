import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import type { RecentUsageEntry } from '../../types/usage'

interface UsageChartsProps {
  entries: RecentUsageEntry[]
  isLoading?: boolean
}

const PROVIDER_COLORS = {
  claude: { primary: '#a855f7', gradient: ['#c084fc', '#7c3aed'] },
  codex: { primary: '#10b981', gradient: ['#34d399', '#059669'] },
  cursor: { primary: '#0ea5e9', gradient: ['#38bdf8', '#0284c7'] }
}

const PROVIDER_LABELS = {
  claude: 'Claude',
  codex: 'Codex',
  cursor: 'Cursor'
}

function formatCost(value: number): string {
  if (value < 0.01) return `$${value.toFixed(4)}`
  if (value < 1) return `$${value.toFixed(3)}`
  return `$${value.toFixed(2)}`
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(0)}K`
  return tokens.toString()
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    color: string
    dataKey: string
  }>
  label?: string
}

function CostTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-slate-400 mb-1.5">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-slate-300">{entry.name}:</span>
          <span className="font-mono text-white">{formatCost(entry.value)}</span>
        </div>
      ))}
    </div>
  )
}

function TokensTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-slate-400 mb-1.5">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-slate-300">{entry.name}:</span>
          <span className="font-mono text-white">{formatTokens(entry.value)}</span>
        </div>
      ))}
    </div>
  )
}

function PieTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const data = payload[0]

  return (
    <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-lg px-3 py-2 shadow-xl">
      <div className="flex items-center gap-2 text-sm">
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: data.color }}
        />
        <span className="text-slate-300">{data.name}:</span>
        <span className="font-mono text-white">{formatCost(data.value)}</span>
      </div>
    </div>
  )
}

export function UsageCharts({ entries, isLoading }: UsageChartsProps) {
  // Provider breakdown data
  const providerData = useMemo(() => {
    const byProvider = entries.reduce((acc, entry) => {
      if (!acc[entry.provider]) {
        acc[entry.provider] = { cost: 0, tokens: 0, count: 0 }
      }
      acc[entry.provider].cost += entry.cost
      acc[entry.provider].tokens += entry.totalTokens
      acc[entry.provider].count += 1
      return acc
    }, {} as Record<string, { cost: number; tokens: number; count: number }>)

    return Object.entries(byProvider).map(([provider, data]) => ({
      name: PROVIDER_LABELS[provider as keyof typeof PROVIDER_LABELS] || provider,
      provider,
      cost: data.cost,
      tokens: data.tokens,
      count: data.count,
      color: PROVIDER_COLORS[provider as keyof typeof PROVIDER_COLORS]?.primary || '#64748b'
    }))
  }, [entries])

  // Time-based data (hourly for session, daily for monthly)
  const timeData = useMemo(() => {
    if (entries.length === 0) return []

    // Get time range
    const timestamps = entries.map(e => new Date(e.timestamp).getTime())
    const minTime = Math.min(...timestamps)
    const maxTime = Math.max(...timestamps)
    const rangeHours = (maxTime - minTime) / (1000 * 60 * 60)

    // Use hourly buckets for < 48 hours, otherwise daily
    const useHourly = rangeHours < 48

    const buckets: Record<string, { claude: number; codex: number; cursor: number; label: string }> = {}

    entries.forEach(entry => {
      const date = new Date(entry.timestamp)
      let bucketKey: string
      let label: string

      if (useHourly) {
        const hour = date.getHours()
        const day = date.getDate()
        const month = date.getMonth()
        bucketKey = `${month}-${day}-${hour}`
        label = `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${hour}:00`
      } else {
        const day = date.getDate()
        const month = date.getMonth()
        const year = date.getFullYear()
        bucketKey = `${year}-${month}-${day}`
        label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }

      if (!buckets[bucketKey]) {
        buckets[bucketKey] = { claude: 0, codex: 0, cursor: 0, label }
      }

      buckets[bucketKey][entry.provider] += entry.cost
    })

    // Sort by time and return
    return Object.values(buckets).sort((a, b) => {
      // Parse the label back to compare
      return a.label.localeCompare(b.label)
    })
  }, [entries])

  // Project breakdown (Claude only, top 10)
  const projectData = useMemo(() => {
    const byProject = entries
      .filter(e => e.provider === 'claude' && e.projectName)
      .reduce((acc, entry) => {
        const projectName = entry.projectName || 'Unknown'
        if (!acc[projectName]) {
          acc[projectName] = { cost: 0, tokens: 0, count: 0 }
        }
        acc[projectName].cost += entry.cost
        acc[projectName].tokens += entry.totalTokens
        acc[projectName].count += 1
        return acc
      }, {} as Record<string, { cost: number; tokens: number; count: number }>)

    return Object.entries(byProject)
      .map(([name, data]) => {
        // Extract only the last folder name from the path
        const lastFolder = name.split('/').filter(Boolean).pop() || name
        return {
          name: lastFolder,
          fullName: name,
          cost: data.cost,
          tokens: data.tokens,
          count: data.count
        }
      })
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 8)
  }, [entries])

  // Model breakdown
  const modelData = useMemo(() => {
    const byModel = entries.reduce((acc, entry) => {
      const modelName = formatModelName(entry.model)
      if (!acc[modelName]) {
        acc[modelName] = { cost: 0, tokens: 0, count: 0, provider: entry.provider }
      }
      acc[modelName].cost += entry.cost
      acc[modelName].tokens += entry.totalTokens
      acc[modelName].count += 1
      return acc
    }, {} as Record<string, { cost: number; tokens: number; count: number; provider: string }>)

    return Object.entries(byModel)
      .map(([name, data]) => ({
        name,
        cost: data.cost,
        tokens: data.tokens,
        count: data.count,
        color: PROVIDER_COLORS[data.provider as keyof typeof PROVIDER_COLORS]?.primary || '#64748b'
      }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 6)
  }, [entries])

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="chart-card animate-pulse">
            <div className="h-4 w-32 bg-white/10 rounded mb-4" />
            <div className="h-48 bg-white/5 rounded-lg" />
          </div>
        ))}
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="chart-card flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
          <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-slate-300 font-medium mb-1">No usage data</h3>
        <p className="text-slate-500 text-sm text-center max-w-[280px]">
          Usage data will appear here as you use Claude Code, Codex, or Cursor
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
      {/* Cost by Provider - Pie Chart */}
      <div className="chart-card">
        <h3 className="chart-title">
          <span className="chart-title-icon">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" strokeWidth={2} />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v10l7 4" />
            </svg>
          </span>
          Cost by Provider
        </h3>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={providerData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={3}
                dataKey="cost"
                nameKey="name"
                strokeWidth={0}
              >
                {providerData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    className="transition-opacity hover:opacity-80"
                  />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => <span className="text-xs text-slate-400">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {/* Provider stats */}
        <div className="flex justify-center gap-6 mt-2 pt-3 border-t border-white/5">
          {providerData.map(p => (
            <div key={p.provider} className="text-center">
              <div className="text-xs text-slate-500 mb-0.5">{p.name}</div>
              <div className="font-mono text-sm" style={{ color: p.color }}>{formatCost(p.cost)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Cost over Time - Area Chart */}
      <div className="chart-card">
        <h3 className="chart-title">
          <span className="chart-title-icon">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </span>
          Cost over Time
        </h3>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorClaude" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCodex" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCursor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fill: '#64748b', fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: '#334155', strokeWidth: 1 }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCost(value)}
              />
              <Tooltip content={<CostTooltip />} />
              <Area
                type="monotone"
                dataKey="claude"
                name="Claude"
                stackId="1"
                stroke="#a855f7"
                fill="url(#colorClaude)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="codex"
                name="Codex"
                stackId="1"
                stroke="#10b981"
                fill="url(#colorCodex)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="cursor"
                name="Cursor"
                stackId="1"
                stroke="#0ea5e9"
                fill="url(#colorCursor)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cost by Project - Bar Chart */}
      <div className="chart-card">
        <h3 className="chart-title">
          <span className="chart-title-icon">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </span>
          Cost by Project
          <span className="text-[10px] text-slate-500 font-normal ml-2">(Claude)</span>
        </h3>
        {projectData.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-sm text-slate-500">
            No project data available
          </div>
        ) : (
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectData} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="projectGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity={0.8}/>
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={1}/>
                  </linearGradient>
                </defs>
                <XAxis
                  type="number"
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: '#334155', strokeWidth: 1 }}
                  tickFormatter={(value) => formatCost(value)}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={80}
                />
                <Tooltip content={<CostTooltip />} />
                <Bar
                  dataKey="cost"
                  name="Cost"
                  fill="url(#projectGradient)"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Cost by Model - Bar Chart */}
      <div className="chart-card">
        <h3 className="chart-title">
          <span className="chart-title-icon">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </span>
          Cost by Model
        </h3>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={modelData} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <XAxis
                type="number"
                tick={{ fill: '#64748b', fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: '#334155', strokeWidth: 1 }}
                tickFormatter={(value) => formatCost(value)}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={80}
              />
              <Tooltip content={<CostTooltip />} />
              <Bar
                dataKey="cost"
                name="Cost"
                radius={[0, 4, 4, 0]}
                maxBarSize={24}
              >
                {modelData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function formatModelName(model: string): string {
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
  if (model.length > 15) {
    const parts = model.split('-')
    return parts.slice(-2).join('-')
  }
  return model
}
