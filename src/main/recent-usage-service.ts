import { readFile, readdir, stat } from 'fs/promises'
import { join, basename, dirname } from 'path'
import { homedir } from 'os'
import type { RecentUsageEntry, RecentUsagesData, LiteLLMPricingData, ModelPricing, UsageFilterMode, ProviderFilter, ProviderName } from '../types/usage'
import { getCursorToken } from './usage-service'

const LITELLM_PRICING_URL = 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json'
const CURSOR_USAGE_API_URL = 'https://cursor.com/api/dashboard/get-filtered-usage-events'
const CLAUDE_PROJECTS_DIR = join(homedir(), '.claude', 'projects')
const CODEX_DIR = join(homedir(), '.codex')

// Cache for LiteLLM pricing data
let pricingCache: LiteLLMPricingData | null = null
let pricingCacheTime = 0
const PRICING_CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

// App start time for session filtering
let appStartTime: Date = new Date()

/**
 * Sets the app start time for session filtering
 */
export function setAppStartTime(time: Date): void {
  appStartTime = time
}

/**
 * Gets the app start time
 */
export function getAppStartTime(): Date {
  return appStartTime
}

interface ClaudeJSONLEntry {
  type?: string
  message?: {
    role?: string
    model?: string
    stop_reason?: string | null
    usage?: {
      input_tokens?: number
      output_tokens?: number
      cache_creation_input_tokens?: number
      cache_read_input_tokens?: number
    }
  }
  timestamp?: string
  costUSD?: number
}

interface CodexJSONLEntry {
  type?: string
  model?: string
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
  timestamp?: string
  created?: number
}

interface CursorUsageEvent {
  timestamp?: string
  model?: string
  kind?: string
  maxMode?: boolean
  usageBasedCosts?: string
  isTokenBasedCall?: boolean
  tokenUsage?: {
    inputTokens?: number
    outputTokens?: number
    cacheHits?: number
    cacheMisses?: number
  }
  owningUser?: string
  cursorTokenFee?: number
  isChargeable?: boolean
  isHeadless?: boolean
}

interface CursorUsageResponse {
  totalUsageEventsCount: number
  usageEventsDisplay: CursorUsageEvent[]
}

/**
 * Fetches LiteLLM pricing data with caching
 */
export async function fetchLiteLLMPricing(): Promise<LiteLLMPricingData> {
  const now = Date.now()

  if (pricingCache && (now - pricingCacheTime) < PRICING_CACHE_TTL_MS) {
    return pricingCache
  }

  try {
    const response = await fetch(LITELLM_PRICING_URL)
    if (!response.ok) {
      throw new Error(`Failed to fetch pricing: ${response.status}`)
    }

    pricingCache = await response.json() as LiteLLMPricingData
    pricingCacheTime = now
    return pricingCache
  } catch (error) {
    console.error('Failed to fetch LiteLLM pricing:', error)
    // Return cached data if available, even if stale
    if (pricingCache) {
      return pricingCache
    }
    // Return empty object if no cache available
    return {}
  }
}

/**
 * Gets pricing for a specific model
 */
function getModelPricing(pricing: LiteLLMPricingData, model: string): ModelPricing | null {
  // Try exact match first
  if (pricing[model]) {
    return pricing[model]
  }

  // Try with provider prefix
  const claudeKey = `claude/${model}`
  if (pricing[claudeKey]) {
    return pricing[claudeKey]
  }

  // Try anthropic prefix
  const anthropicKey = `anthropic/${model}`
  if (pricing[anthropicKey]) {
    return pricing[anthropicKey]
  }

  // Try partial match for model names like "claude-3-5-sonnet-20241022"
  for (const key of Object.keys(pricing)) {
    if (key.includes(model) || model.includes(key.replace('claude/', '').replace('anthropic/', ''))) {
      return pricing[key]
    }
  }

  return null
}

/**
 * Calculates cost for a usage entry
 */
function calculateCost(
  pricing: LiteLLMPricingData,
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheCreationTokens: number,
  cacheReadTokens: number
): number {
  const modelPricing = getModelPricing(pricing, model)

  if (!modelPricing) {
    return 0
  }

  const inputCost = (inputTokens * (modelPricing.input_cost_per_token || 0))
  const outputCost = (outputTokens * (modelPricing.output_cost_per_token || 0))
  const cacheCreationCost = (cacheCreationTokens * (modelPricing.cache_creation_input_token_cost || modelPricing.input_cost_per_token || 0))
  const cacheReadCost = (cacheReadTokens * (modelPricing.cache_read_input_token_cost || modelPricing.input_cost_per_token || 0))

  return inputCost + outputCost + cacheCreationCost + cacheReadCost
}

/**
 * Recursively finds all JSONL files in a directory
 */
async function findJSONLFiles(dir: string, maxDepth = 3, currentDepth = 0): Promise<string[]> {
  if (currentDepth >= maxDepth) return []

  const files: string[] = []

  try {
    const entries = await readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(dir, entry.name)

      if (entry.isDirectory()) {
        const subFiles = await findJSONLFiles(fullPath, maxDepth, currentDepth + 1)
        files.push(...subFiles)
      } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        files.push(fullPath)
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }

  return files
}

/**
 * Parses a JSONL file and extracts usage entries
 */
async function parseClaudeJSONLFile(
  filePath: string,
  pricing: LiteLLMPricingData
): Promise<RecentUsageEntry[]> {
  const entries: RecentUsageEntry[] = []

  try {
    const content = await readFile(filePath, 'utf-8')
    const lines = content.split('\n').filter(line => line.trim())

    // Extract project name from path
    const projectName = basename(dirname(filePath))
    const sessionId = basename(filePath, '.jsonl')

    for (const line of lines) {
      try {
        const entry: ClaudeJSONLEntry = JSON.parse(line)

        // Process entries with usage data
        // Accept: entries with type='assistant' and message.usage, OR entries with message.usage but no type (usage summary entries)
        const usage = entry.message?.usage
        const hasUsageData = usage && (usage.input_tokens != null || usage.output_tokens != null)
        const isValidEntry = hasUsageData && (entry.type === 'assistant' || entry.type === undefined)
        if (isValidEntry && usage) {
          const model = entry.message?.model || 'unknown'

          const inputTokens = usage.input_tokens || 0
          const outputTokens = usage.output_tokens || 0
          const cacheCreationTokens = usage.cache_creation_input_tokens || 0
          const cacheReadTokens = usage.cache_read_input_tokens || 0
          const totalTokens = inputTokens + outputTokens + cacheCreationTokens + cacheReadTokens

          // Use costUSD if available, otherwise calculate
          const cost = entry.costUSD ?? calculateCost(
            pricing,
            model,
            inputTokens,
            outputTokens,
            cacheCreationTokens,
            cacheReadTokens
          )

          const timestamp = entry.timestamp ? new Date(entry.timestamp) : new Date()

          entries.push({
            id: `claude-${sessionId}-${entries.length}`,
            timestamp,
            provider: 'claude',
            model,
            inputTokens,
            outputTokens,
            cacheCreationTokens,
            cacheReadTokens,
            totalTokens,
            cost,
            sessionId,
            projectName
          })
        }
      } catch {
        // Skip malformed lines
      }
    }
  } catch {
    // File doesn't exist or can't be read
  }

  return entries
}

/**
 * Parses Codex JSONL files
 */
async function parseCodexJSONLFile(
  filePath: string,
  pricing: LiteLLMPricingData
): Promise<RecentUsageEntry[]> {
  const entries: RecentUsageEntry[] = []

  try {
    const content = await readFile(filePath, 'utf-8')
    const lines = content.split('\n').filter(line => line.trim())

    const sessionId = basename(filePath, '.jsonl')

    for (const line of lines) {
      try {
        const entry: CodexJSONLEntry = JSON.parse(line)

        if (entry.usage) {
          const model = entry.model || 'gpt-4'
          const inputTokens = entry.usage.prompt_tokens || 0
          const outputTokens = entry.usage.completion_tokens || 0
          const totalTokens = entry.usage.total_tokens || inputTokens + outputTokens

          const cost = calculateCost(pricing, model, inputTokens, outputTokens, 0, 0)

          let timestamp: Date
          if (entry.timestamp) {
            timestamp = new Date(entry.timestamp)
          } else if (entry.created) {
            timestamp = new Date(entry.created * 1000)
          } else {
            timestamp = new Date()
          }

          entries.push({
            id: `codex-${sessionId}-${entries.length}`,
            timestamp,
            provider: 'codex',
            model,
            inputTokens,
            outputTokens,
            cacheCreationTokens: 0,
            cacheReadTokens: 0,
            totalTokens,
            cost,
            sessionId
          })
        }
      } catch {
        // Skip malformed lines
      }
    }
  } catch {
    // File doesn't exist or can't be read
  }

  return entries
}

/**
 * Fetches a single page of Cursor usage events
 */
async function fetchCursorUsagePage(
  sessionToken: string,
  page: number,
  pageSize: number
): Promise<CursorUsageResponse | null> {
  try {
    const response = await fetch(CURSOR_USAGE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://cursor.com',
        'Cookie': `WorkosCursorSessionToken=${sessionToken}`
      },
      body: JSON.stringify({ pageSize, page })
    })

    if (!response.ok) {
      console.error(`Failed to fetch Cursor usage events page ${page}:`, response.status)
      return null
    }

    return await response.json() as CursorUsageResponse
  } catch (error) {
    console.error(`Error fetching Cursor usage page ${page}:`, error)
    return null
  }
}

/**
 * Parses Cursor usage events into RecentUsageEntry format
 */
function parseCursorEvents(
  events: CursorUsageEvent[],
  pricing: LiteLLMPricingData,
  startIndex: number
): RecentUsageEntry[] {
  const entries: RecentUsageEntry[] = []

  for (const event of events) {
    const model = event.model || 'unknown'
    const tokenUsage = event.tokenUsage || {}
    const inputTokens = tokenUsage.inputTokens || 0
    const outputTokens = tokenUsage.outputTokens || 0
    const cacheReadTokens = tokenUsage.cacheHits || 0
    const cacheCreationTokens = tokenUsage.cacheMisses || 0
    const totalTokens = inputTokens + outputTokens + cacheReadTokens + cacheCreationTokens

    const cost = calculateCost(pricing, model, inputTokens, outputTokens, cacheCreationTokens, cacheReadTokens)

    // Timestamp is a Unix timestamp in milliseconds as a string
    const timestamp = event.timestamp ? new Date(parseInt(event.timestamp, 10)) : new Date()

    entries.push({
      id: `cursor-${timestamp.getTime()}-${startIndex + entries.length}`,
      timestamp,
      provider: 'cursor',
      model,
      inputTokens,
      outputTokens,
      cacheCreationTokens,
      cacheReadTokens,
      totalTokens,
      cost
    })
  }

  return entries
}

/**
 * Fetches all Cursor usage events from the API with parallel pagination
 */
async function fetchCursorUsageEvents(
  sessionToken: string,
  pricing: LiteLLMPricingData,
  pageSize = 500
): Promise<RecentUsageEntry[]> {
  // First request to get total count and first batch
  const firstPage = await fetchCursorUsagePage(sessionToken, 0, pageSize)

  if (!firstPage || !firstPage.usageEventsDisplay) {
    return []
  }

  const totalCount = firstPage.totalUsageEventsCount
  const allEvents: CursorUsageEvent[] = [...firstPage.usageEventsDisplay]

  console.log(`[Cursor] Total usage events: ${totalCount}, fetched first ${allEvents.length}`)

  // Calculate remaining pages needed
  const totalPages = Math.ceil(totalCount / pageSize)

  if (totalPages > 1) {
    // Fetch remaining pages in parallel
    const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 1)

    console.log(`[Cursor] Fetching ${remainingPages.length} additional pages in parallel...`)

    const pageResults = await Promise.allSettled(
      remainingPages.map(page => fetchCursorUsagePage(sessionToken, page, pageSize))
    )

    for (const result of pageResults) {
      if (result.status === 'fulfilled' && result.value?.usageEventsDisplay) {
        allEvents.push(...result.value.usageEventsDisplay)
      }
    }

    console.log(`[Cursor] Total events fetched: ${allEvents.length}`)
  }

  return parseCursorEvents(allEvents, pricing, 0)
}

/**
 * Gets the most recently modified JSONL files
 */
async function getMostRecentFiles(files: string[], limit: number): Promise<string[]> {
  const fileStats = await Promise.all(
    files.map(async (file) => {
      try {
        const stats = await stat(file)
        return { file, mtime: stats.mtime.getTime() }
      } catch {
        return { file, mtime: 0 }
      }
    })
  )

  return fileStats
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, limit)
    .map(f => f.file)
}

/**
 * Gets the start of the current month
 */
function getStartOfMonth(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

/**
 * Filters entries based on the filter mode
 */
function filterEntries(entries: RecentUsageEntry[], filterMode: UsageFilterMode): RecentUsageEntry[] {
  const cutoffTime = filterMode === 'session' ? appStartTime : getStartOfMonth()

  return entries.filter(entry => entry.timestamp.getTime() >= cutoffTime.getTime())
}

const ALL_PROVIDERS: ProviderName[] = ['claude', 'codex', 'cursor']

/**
 * Fetches recent usage data from local JSONL files and APIs with pagination
 */
export async function getRecentUsages(
  page = 1,
  pageSize = 50,
  filterMode: UsageFilterMode = 'session',
  providers: ProviderFilter = ALL_PROVIDERS
): Promise<RecentUsagesData> {
  const pricing = await fetchLiteLLMPricing()
  const allEntries: RecentUsageEntry[] = []

  // Normalize providers - if empty array, show all
  const activeProviders = providers.length === 0 ? ALL_PROVIDERS : providers

  // Get Claude usage from JSONL files
  if (activeProviders.includes('claude')) {
    try {
      const claudeFiles = await findJSONLFiles(CLAUDE_PROJECTS_DIR)
      const recentClaudeFiles = await getMostRecentFiles(claudeFiles, 50)

      for (const file of recentClaudeFiles) {
        const entries = await parseClaudeJSONLFile(file, pricing)
        allEntries.push(...entries)
      }
    } catch (error) {
      console.error('Error reading Claude usage files:', error)
    }
  }

  // Get Codex usage from JSONL files
  if (activeProviders.includes('codex')) {
    try {
      const codexFiles = await findJSONLFiles(CODEX_DIR)
      const recentCodexFiles = await getMostRecentFiles(codexFiles, 50)

      for (const file of recentCodexFiles) {
        const entries = await parseCodexJSONLFile(file, pricing)
        allEntries.push(...entries)
      }
    } catch (error) {
      console.error('Error reading Codex usage files:', error)
    }
  }

  // Get Cursor usage from API (fetches all events with parallel pagination)
  if (activeProviders.includes('cursor')) {
    try {
      const cursorToken = getCursorToken()
      if (cursorToken) {
        const cursorEntries = await fetchCursorUsageEvents(cursorToken, pricing)
        allEntries.push(...cursorEntries)
      }
    } catch (error) {
      console.error('Error fetching Cursor usage:', error)
    }
  }

  // Sort by timestamp (most recent first)
  const sortedEntries = allEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

  // Apply filter based on mode
  const filteredEntries = filterEntries(sortedEntries, filterMode)

  // Calculate total cost from filtered entries
  const totalCost = filteredEntries.reduce((sum, entry) => sum + entry.cost, 0)
  const totalCount = filteredEntries.length
  const totalPages = Math.ceil(totalCount / pageSize)

  // Paginate
  const startIndex = (page - 1) * pageSize
  const paginatedEntries = filteredEntries.slice(startIndex, startIndex + pageSize)

  return {
    entries: paginatedEntries,
    totalCost,
    totalCount,
    page,
    pageSize,
    totalPages,
    lastUpdated: new Date(),
    filterMode,
    appStartedAt: appStartTime
  }
}
