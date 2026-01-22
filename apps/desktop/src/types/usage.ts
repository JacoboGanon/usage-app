export interface ClaudeUsageData {
  hasCredentials: boolean
  subscriptionType: string
  rateLimitTier: string | null
  sessionUsagePercent: number
  sessionResetTime: string | null
  weeklyUsagePercent: number
  weeklyResetTime: string | null
  opusUsagePercent: number
  sonnetUsagePercent: number
  lastError: string | null
  lastUpdated: string
}

export interface CodexUsageData {
  hasCredentials: boolean
  planType: string
  primaryUsedPercent: number
  primaryWindowSeconds: number | null
  primaryResetTime: string | null
  secondaryUsedPercent: number
  secondaryWindowSeconds: number | null
  secondaryResetTime: string | null
  lastError: string | null
  lastUpdated: string
}

export interface CursorUsageData {
  hasCredentials: boolean
  membershipType: string
  totalUsagePercent: number
  apiUsagePercent: number
  usedRequests: number
  limitRequests: number
  remainingRequests: number
  billingCycleEnd: string | null
  lastError: string | null
  lastUpdated: string
}

export interface UsageUpdate {
  claude: ClaudeUsageData
  codex: CodexUsageData
  cursor: CursorUsageData
}

export type ProviderName = 'claude' | 'codex' | 'cursor'

export type UsageFilterMode = 'session' | 'monthly'

export type ProviderFilter = ProviderName[]

export interface TokenResult {
  token: string
  source: string
  subscriptionType?: string
  rateLimitTier?: string
}

// LiteLLM pricing data
export interface ModelPricing {
  input_cost_per_token?: number
  output_cost_per_token?: number
  cache_creation_input_token_cost?: number
  cache_read_input_token_cost?: number
  max_input_tokens?: number
  max_output_tokens?: number
  litellm_provider?: string
}

export interface LiteLLMPricingData {
  [modelName: string]: ModelPricing
}

// Recent usage entry
export interface RecentUsageEntry {
  id: string
  timestamp: Date
  provider: 'claude' | 'codex' | 'cursor'
  model: string
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  totalTokens: number
  cost: number
  sessionId?: string
  projectName?: string
}

export interface RecentUsagesData {
  entries: RecentUsageEntry[]
  totalCost: number
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
  lastUpdated: Date
  filterMode: UsageFilterMode
  appStartedAt?: Date
}
