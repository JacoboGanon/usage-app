import { exec } from 'child_process'
import { promisify } from 'util'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { homedir, userInfo } from 'os'
import { app, safeStorage } from 'electron'
import type { ClaudeUsageData, CodexUsageData, CursorUsageData, UsageUpdate, TokenResult } from '../types/usage'

const execAsync = promisify(exec)

const CLAUDE_USAGE_API_URL = 'https://api.anthropic.com/api/oauth/usage'
const CODEX_USAGE_API_URL = 'https://chatgpt.com/backend-api/wham/usage'
const CURSOR_USAGE_API_URL = 'https://cursor.com/api/usage-summary'
const DEFAULT_POLL_INTERVAL_MS = 30 * 1000 // 30 seconds
const MIN_POLL_INTERVAL_MS = 5 * 1000
const MAX_POLL_INTERVAL_MS = 5 * 60 * 1000
const USER_AGENT = 'claude-code/2.0.32'

// In-memory storage for Cursor token (will be set via IPC)
let cursorSessionToken: string | null = null

// Encrypted storage for Cursor token
const CURSOR_TOKEN_FILENAME = 'cursor-token.enc'

function getCursorTokenPath(): string {
  return join(app.getPath('userData'), CURSOR_TOKEN_FILENAME)
}

/**
 * Saves the Cursor token to encrypted storage using safeStorage
 */
async function saveCursorTokenToStorage(token: string | null): Promise<void> {
  const tokenPath = getCursorTokenPath()

  if (!token) {
    // Delete the file if token is cleared
    try {
      const { unlink } = await import('fs/promises')
      await unlink(tokenPath)
    } catch {
      // File doesn't exist, ignore
    }
    return
  }

  if (!safeStorage.isEncryptionAvailable()) {
    console.warn('[CursorToken] Encryption not available, token will not be persisted')
    return
  }

  try {
    const encrypted = safeStorage.encryptString(token)
    await mkdir(app.getPath('userData'), { recursive: true })
    await writeFile(tokenPath, encrypted)
  } catch (error) {
    console.error('[CursorToken] Failed to save token:', (error as Error).message)
  }
}

/**
 * Loads the Cursor token from encrypted storage using safeStorage
 */
async function loadCursorTokenFromStorage(): Promise<string | null> {
  if (!safeStorage.isEncryptionAvailable()) {
    console.warn('[CursorToken] Encryption not available')
    return null
  }

  try {
    const tokenPath = getCursorTokenPath()
    const encrypted = await readFile(tokenPath)
    const token = safeStorage.decryptString(encrypted)
    return token
  } catch {
    // File doesn't exist or can't be read
    return null
  }
}

/**
 * Initializes the Cursor token from persistent storage
 * Should be called when the app starts
 */
export async function initCursorToken(): Promise<void> {
  const token = await loadCursorTokenFromStorage()
  if (token) {
    cursorSessionToken = token
  }
}

// Keychain service names to try
const KEYCHAIN_SERVICE_NAMES = [
  'Claude Code-credentials',
  'claude.ai',
  'Claude Code',
  'claude-code',
  'anthropic.com'
]

interface ClaudeApiUsageResponse {
  five_hour?: {
    utilization?: number
    resets_at?: string
  }
  seven_day?: {
    utilization?: number
    resets_at?: string
  }
  seven_day_opus?: {
    utilization?: number
  }
  seven_day_sonnet?: {
    utilization?: number
  }
}

interface CodexApiUsageResponse {
  plan_type?: string
  rate_limit?: {
    primary_window?: {
      used_percent?: number
      limit_window_seconds?: number
      reset_at?: number
    }
    secondary_window?: {
      used_percent?: number
      limit_window_seconds?: number
      reset_at?: number
    }
  }
}

interface CredentialsFile {
  claudeAiOauth?: {
    accessToken?: string
    expiresAt?: number
    subscriptionType?: string
    rateLimitTier?: string
  }
}

interface CodexAuthFile {
  tokens?: {
    access_token?: string
  }
}

interface CursorApiUsageResponse {
  billingCycleStart?: string
  billingCycleEnd?: string
  membershipType?: string
  individualUsage?: {
    plan?: {
      used?: number
      limit?: number
      remaining?: number
      totalPercentUsed?: number
      apiPercentUsed?: number
    }
  }
}

/**
 * Parses a keychain value which may be either a raw token or a JSON credentials object
 */
function parseKeychainValue(value: string): TokenResult | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  // Check if it's a JSON object (credentials format)
  if (trimmed.startsWith('{')) {
    try {
      const parsed: CredentialsFile = JSON.parse(trimmed)
      const oauth = parsed.claudeAiOauth
      if (oauth?.accessToken) {
        return {
          token: oauth.accessToken,
          subscriptionType: oauth.subscriptionType || 'Unknown',
          rateLimitTier: oauth.rateLimitTier,
          source: 'keychain'
        }
      }
    } catch {
      // Not valid JSON, treat as raw token
    }
  }

  // Treat as raw token
  return { token: trimmed, source: 'keychain' }
}

/**
 * Attempts to extract OAuth token from Mac Keychain
 * Uses the security CLI to access the keychain
 */
async function getTokenFromKeychain(): Promise<TokenResult | null> {
  for (const serviceName of KEYCHAIN_SERVICE_NAMES) {
    try {
      // Try to find the password in the keychain
      const { stdout } = await execAsync(
        `security find-generic-password -s "${serviceName}" -w 2>/dev/null`
      )
      const result = parseKeychainValue(stdout)
      if (result) {
        return result
      }
    } catch {
      // Service not found, try next
    }

    // Try with different account names (including current username)
    const accountNames = [userInfo().username, 'oauth', 'access_token', 'default']
    for (const account of accountNames) {
      try {
        const { stdout } = await execAsync(
          `security find-generic-password -s "${serviceName}" -a "${account}" -w 2>/dev/null`
        )
        const result = parseKeychainValue(stdout)
        if (result) {
          return result
        }
      } catch {
        // Continue trying
      }
    }
  }
  return null
}

/**
 * Reads credentials from the Claude credentials file
 * Fallback if keychain access fails
 */
async function getTokenFromCredentialsFile(): Promise<TokenResult | null> {
  try {
    const credentialsPath = join(homedir(), '.claude', '.credentials.json')
    const content = await readFile(credentialsPath, 'utf-8')
    const credentials: CredentialsFile = JSON.parse(content)

    const oauth = credentials.claudeAiOauth
    if (!oauth?.accessToken) {
      return null
    }

    // Check if token is expired
    if (oauth.expiresAt) {
      const expiresAtMs = oauth.expiresAt
      const bufferMs = 5 * 60 * 1000 // 5 minute buffer
      if (Date.now() + bufferMs > expiresAtMs) {
        console.warn('OAuth token has expired or is about to expire')
        return null
      }
    }

    return {
      token: oauth.accessToken,
      subscriptionType: oauth.subscriptionType || 'Unknown',
      rateLimitTier: oauth.rateLimitTier,
      source: 'credentials_file'
    }
  } catch {
    return null
  }
}

/**
 * Gets the OAuth token from available sources
 */
export async function getOAuthToken(): Promise<TokenResult | null> {
  // Try keychain first
  const keychainResult = await getTokenFromKeychain()
  if (keychainResult) {
    return keychainResult
  }

  // Fall back to credentials file
  const fileResult = await getTokenFromCredentialsFile()
  if (fileResult) {
    return fileResult
  }

  return null
}

/**
 * Fetches usage data from the Anthropic API
 */
export async function fetchUsage(accessToken: string): Promise<ClaudeApiUsageResponse> {
  const response = await fetch(CLAUDE_USAGE_API_URL, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'anthropic-beta': 'oauth-2025-04-20',
      'User-Agent': USER_AGENT
    }
  })

  if (!response.ok) {
    throw new Error(`API error: HTTP ${response.status}`)
  }

  return response.json()
}

/**
 * Parses usage response into a normalized format
 */
function parseUsageResponse(usage: ClaudeApiUsageResponse, subscriptionType = 'Unknown', rateLimitTier?: string): ClaudeUsageData {
  const parseResetTime = (resets_at?: string): string | null => {
    if (!resets_at) return null
    try {
      return new Date(resets_at).toISOString()
    } catch {
      return null
    }
  }

  return {
    hasCredentials: true,
    subscriptionType,
    rateLimitTier: rateLimitTier || null,
    sessionUsagePercent: (usage.five_hour?.utilization ?? 0) / 100,
    sessionResetTime: parseResetTime(usage.five_hour?.resets_at),
    weeklyUsagePercent: (usage.seven_day?.utilization ?? 0) / 100,
    weeklyResetTime: parseResetTime(usage.seven_day?.resets_at),
    opusUsagePercent: (usage.seven_day_opus?.utilization ?? 0) / 100,
    sonnetUsagePercent: (usage.seven_day_sonnet?.utilization ?? 0) / 100,
    lastError: null,
    lastUpdated: new Date().toISOString()
  }
}

/**
 * Creates a usage update with error state
 */
function createErrorUpdate(error: string, hasCredentials = false, subscriptionType = 'Unknown'): ClaudeUsageData {
  return {
    hasCredentials,
    subscriptionType,
    rateLimitTier: null,
    sessionUsagePercent: 0,
    sessionResetTime: null,
    weeklyUsagePercent: 0,
    weeklyResetTime: null,
    opusUsagePercent: 0,
    sonnetUsagePercent: 0,
    lastError: error,
    lastUpdated: new Date().toISOString()
  }
}

/**
 * Fetches complete Claude usage update
 */
async function getClaudeUsageUpdate(): Promise<ClaudeUsageData> {
  try {
    const tokenResult = await getOAuthToken()

    if (!tokenResult) {
      return createErrorUpdate('No valid credentials found', false, 'Not logged in')
    }

    const usage = await fetchUsage(tokenResult.token)
    return parseUsageResponse(usage, tokenResult.subscriptionType || 'Unknown', tokenResult.rateLimitTier)
  } catch (error) {
    console.error('Failed to fetch usage:', (error as Error).message)
    return createErrorUpdate((error as Error).message, true)
  }
}

async function getCodexTokenFromAuthFile(): Promise<TokenResult | null> {
  try {
    const authPath = join(homedir(), '.codex', 'auth.json')
    const content = await readFile(authPath, 'utf-8')
    const auth: CodexAuthFile = JSON.parse(content)
    const token = auth?.tokens?.access_token
    if (!token) {
      return null
    }
    return { token, source: 'auth_file' }
  } catch {
    return null
  }
}

async function fetchCodexUsage(accessToken: string): Promise<CodexApiUsageResponse> {
  const response = await fetch(CODEX_USAGE_API_URL, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (!response.ok) {
    throw new Error(`API error: HTTP ${response.status}`)
  }

  return response.json()
}

function parseCodexUsageResponse(usage: CodexApiUsageResponse): CodexUsageData {
  const parseEpochSeconds = (epochSeconds?: number): string | null => {
    if (!epochSeconds) return null
    const date = new Date(epochSeconds * 1000)
    if (Number.isNaN(date.getTime())) {
      return null
    }
    return date.toISOString()
  }

  const primary = usage?.rate_limit?.primary_window || {}
  const secondary = usage?.rate_limit?.secondary_window || {}

  return {
    hasCredentials: true,
    planType: usage?.plan_type || 'Unknown',
    primaryUsedPercent: primary.used_percent ?? 0,
    primaryWindowSeconds: primary.limit_window_seconds ?? null,
    primaryResetTime: parseEpochSeconds(primary.reset_at),
    secondaryUsedPercent: secondary.used_percent ?? 0,
    secondaryWindowSeconds: secondary.limit_window_seconds ?? null,
    secondaryResetTime: parseEpochSeconds(secondary.reset_at),
    lastError: null,
    lastUpdated: new Date().toISOString()
  }
}

function createCodexErrorUpdate(error: string, hasCredentials = false): CodexUsageData {
  return {
    hasCredentials,
    planType: 'Not logged in',
    primaryUsedPercent: 0,
    primaryWindowSeconds: null,
    primaryResetTime: null,
    secondaryUsedPercent: 0,
    secondaryWindowSeconds: null,
    secondaryResetTime: null,
    lastError: error,
    lastUpdated: new Date().toISOString()
  }
}

async function getCodexUsageUpdate(): Promise<CodexUsageData> {
  try {
    const tokenResult = await getCodexTokenFromAuthFile()

    if (!tokenResult) {
      return createCodexErrorUpdate('No valid credentials found', false)
    }

    const usage = await fetchCodexUsage(tokenResult.token)
    return parseCodexUsageResponse(usage)
  } catch (error) {
    console.error('Failed to fetch Codex usage:', (error as Error).message)
    return createCodexErrorUpdate((error as Error).message, true)
  }
}

// ==========================================
// Cursor Provider
// ==========================================

/**
 * Sets the Cursor session token (called via IPC)
 * Also persists to encrypted storage
 */
export async function setCursorToken(token: string | null): Promise<void> {
  cursorSessionToken = token
  await saveCursorTokenToStorage(token)
}

/**
 * Gets the current Cursor session token
 */
export function getCursorToken(): string | null {
  return cursorSessionToken
}

/**
 * Fetches usage data from the Cursor API
 */
async function fetchCursorUsage(sessionToken: string): Promise<CursorApiUsageResponse> {
  const response = await fetch(CURSOR_USAGE_API_URL, {
    method: 'GET',
    headers: {
      'Cookie': `WorkosCursorSessionToken=${sessionToken}`,
      'Origin': 'https://cursor.com'
    }
  })

  if (!response.ok) {
    throw new Error(`API error: HTTP ${response.status}`)
  }

  return response.json()
}

/**
 * Parses Cursor usage response into a normalized format
 */
function parseCursorUsageResponse(usage: CursorApiUsageResponse): CursorUsageData {
  const plan = usage?.individualUsage?.plan || {}

  return {
    hasCredentials: true,
    membershipType: usage?.membershipType || 'Unknown',
    totalUsagePercent: plan.totalPercentUsed ?? 0,
    apiUsagePercent: plan.apiPercentUsed ?? 0,
    usedRequests: plan.used ?? 0,
    limitRequests: plan.limit ?? 0,
    remainingRequests: plan.remaining ?? 0,
    billingCycleEnd: usage?.billingCycleEnd || null,
    lastError: null,
    lastUpdated: new Date().toISOString()
  }
}

/**
 * Creates a Cursor usage update with error state
 */
function createCursorErrorUpdate(error: string, hasCredentials = false): CursorUsageData {
  return {
    hasCredentials,
    membershipType: hasCredentials ? 'Unknown' : 'Not configured',
    totalUsagePercent: 0,
    apiUsagePercent: 0,
    usedRequests: 0,
    limitRequests: 0,
    remainingRequests: 0,
    billingCycleEnd: null,
    lastError: error,
    lastUpdated: new Date().toISOString()
  }
}

/**
 * Fetches complete Cursor usage update
 */
async function getCursorUsageUpdate(): Promise<CursorUsageData> {
  try {
    if (!cursorSessionToken) {
      return createCursorErrorUpdate('No token configured', false)
    }

    const usage = await fetchCursorUsage(cursorSessionToken)
    return parseCursorUsageResponse(usage)
  } catch (error) {
    return createCursorErrorUpdate((error as Error).message, true)
  }
}

/**
 * Fetches complete usage update
 */
export async function getUsageUpdate(): Promise<UsageUpdate> {
  const [claudeResult, codexResult, cursorResult] = await Promise.allSettled([
    getClaudeUsageUpdate(),
    getCodexUsageUpdate(),
    getCursorUsageUpdate()
  ])

  const claude = claudeResult.status === 'fulfilled'
    ? claudeResult.value
    : createErrorUpdate(claudeResult.reason?.message || 'Unknown error', true)

  const codex = codexResult.status === 'fulfilled'
    ? codexResult.value
    : createCodexErrorUpdate(codexResult.reason?.message || 'Unknown error', true)

  const cursor = cursorResult.status === 'fulfilled'
    ? cursorResult.value
    : createCursorErrorUpdate(cursorResult.reason?.message || 'Unknown error', true)

  return { claude, codex, cursor }
}

// Polling state
let pollInterval: ReturnType<typeof setInterval> | null = null
let pollCallback: ((update: UsageUpdate) => void) | null = null
let pollIntervalMs = DEFAULT_POLL_INTERVAL_MS

const clampPollInterval = (value: number): number => {
  if (!Number.isFinite(value)) return DEFAULT_POLL_INTERVAL_MS
  return Math.min(MAX_POLL_INTERVAL_MS, Math.max(MIN_POLL_INTERVAL_MS, Math.round(value)))
}

/**
 * Starts polling for usage updates
 */
export function startPolling(callback: (update: UsageUpdate) => void): void {
  if (pollInterval) {
    stopPolling()
  }

  pollCallback = callback

  // Initial fetch
  getUsageUpdate().then(update => {
    if (pollCallback) pollCallback(update)
  })

  // Set up interval
  pollInterval = setInterval(async () => {
    const update = await getUsageUpdate()
    if (pollCallback) pollCallback(update)
  }, pollIntervalMs)
}

/**
 * Stops polling for usage updates
 */
export function stopPolling(): void {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
    pollCallback = null
  }
}

/**
 * Updates the poll interval in milliseconds
 */
export function setPollInterval(nextIntervalMs: number): number {
  const nextValue = clampPollInterval(nextIntervalMs)
  pollIntervalMs = nextValue

  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }

  if (pollCallback) {
    getUsageUpdate().then(update => {
      if (pollCallback) pollCallback(update)
    })

    pollInterval = setInterval(async () => {
      const update = await getUsageUpdate()
      if (pollCallback) pollCallback(update)
    }, pollIntervalMs)
  }

  return pollIntervalMs
}

/**
 * Gets the current poll interval in milliseconds
 */
export function getPollInterval(): number {
  return pollIntervalMs
}

export type ProviderName = 'claude' | 'codex' | 'cursor'

/**
 * Refreshes usage data for a specific provider
 */
export async function refreshProvider(provider: ProviderName): Promise<UsageUpdate> {
  // Get current cached values for other providers (we'll use the last known values)
  const currentUpdate = await getUsageUpdate()

  // Fetch fresh data for the requested provider
  switch (provider) {
    case 'claude':
      currentUpdate.claude = await getClaudeUsageUpdate()
      break
    case 'codex':
      currentUpdate.codex = await getCodexUsageUpdate()
      break
    case 'cursor':
      currentUpdate.cursor = await getCursorUsageUpdate()
      break
  }

  return currentUpdate
}
