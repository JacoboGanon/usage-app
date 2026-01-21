import { Header } from './components/Header'
import { ClaudeUsageCard } from './components/ClaudeUsageCard'
import { CodexUsageCard } from './components/CodexUsageCard'
import { CursorUsageCard } from './components/CursorUsageCard'
import { RecentUsagesTable } from './components/RecentUsagesTable'
import { ErrorPanel } from './components/ErrorPanel'
import { Footer } from './components/Footer'
import { SettingsPanel } from './components/SettingsPanel'
import { useUsageData } from './hooks/useUsageData'
import { useEffect, useMemo, useState } from 'react'

const DEFAULT_POLL_INTERVAL_MS = 30000
const MIN_POLL_INTERVAL_MS = 5000
const MAX_POLL_INTERVAL_MS = 300000
const TRACKING_STORAGE_KEY = 'usageConsole:tracking'
const POLL_STORAGE_KEY = 'usageConsole:pollIntervalMs'

interface TrackingSettings {
  claude: boolean
  codex: boolean
  cursor: boolean
}

const DEFAULT_TRACKING: TrackingSettings = {
  claude: true,
  codex: true,
  cursor: false
}

const clampPollInterval = (value: number): number => {
  if (!Number.isFinite(value)) return DEFAULT_POLL_INTERVAL_MS
  return Math.min(MAX_POLL_INTERVAL_MS, Math.max(MIN_POLL_INTERVAL_MS, Math.round(value)))
}

const loadTrackingSettings = (): TrackingSettings => {
  if (typeof localStorage === 'undefined') return DEFAULT_TRACKING
  try {
    const raw = localStorage.getItem(TRACKING_STORAGE_KEY)
    if (!raw) return DEFAULT_TRACKING
    const parsed = JSON.parse(raw) as Partial<TrackingSettings>
    return {
      claude: parsed.claude !== undefined ? Boolean(parsed.claude) : DEFAULT_TRACKING.claude,
      codex: parsed.codex !== undefined ? Boolean(parsed.codex) : DEFAULT_TRACKING.codex,
      cursor: parsed.cursor !== undefined ? Boolean(parsed.cursor) : DEFAULT_TRACKING.cursor
    }
  } catch {
    return DEFAULT_TRACKING
  }
}

const loadPollInterval = (): number => {
  if (typeof localStorage === 'undefined') return DEFAULT_POLL_INTERVAL_MS
  const raw = localStorage.getItem(POLL_STORAGE_KEY)
  if (!raw) return DEFAULT_POLL_INTERVAL_MS
  const parsed = Number(raw)
  return clampPollInterval(parsed)
}

export default function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [tracking, setTracking] = useState<TrackingSettings>(loadTrackingSettings)
  const [pollIntervalMs, setPollIntervalMs] = useState<number>(loadPollInterval)
  const [cursorToken, setCursorToken] = useState<string>('')
  const [cursorTokenLoaded, setCursorTokenLoaded] = useState(false)
  const { data, isLoading, pollStartTime } = useUsageData(pollIntervalMs)

  const hasApiError = !window.electronAPI?.usage
  const claude = data?.claude
  const codex = data?.codex
  const cursor = data?.cursor

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TRACKING_STORAGE_KEY, JSON.stringify(tracking))
    }
  }, [tracking])

  // Load cursor token from main process (encrypted storage) on mount
  useEffect(() => {
    if (window.electronAPI?.usage?.getCursorToken) {
      window.electronAPI.usage.getCursorToken()
        .then((token) => {
          if (token) setCursorToken(token)
          setCursorTokenLoaded(true)
        })
        .catch((error: Error) => {
          console.error('Failed to load Cursor token:', error)
          setCursorTokenLoaded(true)
        })
    } else {
      setCursorTokenLoaded(true)
    }
  }, [])

  // Save cursor token to main process (encrypted storage) when changed
  useEffect(() => {
    // Don't save until initial load is complete to avoid overwriting with empty string
    if (!cursorTokenLoaded) return

    if (window.electronAPI?.usage?.setCursorToken) {
      window.electronAPI.usage.setCursorToken(cursorToken || null).catch((error: Error) => {
        console.error('Failed to set Cursor token:', error)
      })
    }
  }, [cursorToken, cursorTokenLoaded])

  useEffect(() => {
    const nextInterval = clampPollInterval(pollIntervalMs)
    if (nextInterval !== pollIntervalMs) {
      setPollIntervalMs(nextInterval)
      return
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(POLL_STORAGE_KEY, String(nextInterval))
    }

    if (window.electronAPI?.usage?.setPollInterval) {
      window.electronAPI.usage.setPollInterval(nextInterval).catch((error: Error) => {
        console.error('Failed to set poll interval:', error)
      })
    }
  }, [pollIntervalMs])

  const errorMessage = useMemo(() => {
    if (hasApiError) return 'Electron API not available'
    const errors: string[] = []
    if (tracking.claude) {
      if (data && !claude?.hasCredentials) errors.push('Please log in to Claude Code')
      const claudeError = claude?.lastError
      if (claudeError) errors.push(claudeError)
    }
    if (tracking.codex) {
      if (data && !codex?.hasCredentials) errors.push('Please log in to Codex')
      const codexError = codex?.lastError
      if (codexError) errors.push(codexError)
    }
    if (tracking.cursor) {
      if (data && !cursor?.hasCredentials) errors.push('Please configure Cursor token in settings')
      const cursorError = cursor?.lastError
      if (cursorError) errors.push(cursorError)
    }
    return errors[0] || ''
  }, [hasApiError, tracking, claude, codex, cursor, data])

  const usageCards = useMemo(() => {
    const cards: JSX.Element[] = []
    if (tracking.claude) cards.push(<ClaudeUsageCard key="claude" data={data} />)
    if (tracking.codex) cards.push(<CodexUsageCard key="codex" data={data} />)
    if (tracking.cursor) cards.push(<CursorUsageCard key="cursor" data={data} />)
    return cards
  }, [tracking, data])

  return (
    <div className={`max-w-[900px] mx-auto p-8 min-h-screen flex flex-col animate-fade-in ${isLoading ? 'loading' : ''}`}>
      <Header isSettingsOpen={isSettingsOpen} onToggleSettings={() => setIsSettingsOpen((open) => !open)} />

      <main className={isSettingsOpen ? 'flex flex-col' : 'grid grid-cols-2 gap-6 max-md:grid-cols-1'}>
        {isSettingsOpen ? (
          <SettingsPanel
            tracking={tracking}
            pollIntervalMs={pollIntervalMs}
            cursorToken={cursorToken}
            onTrackingChange={setTracking}
            onPollIntervalChange={setPollIntervalMs}
            onCursorTokenChange={setCursorToken}
          />
        ) : (
          usageCards
        )}
        {!isSettingsOpen && usageCards.length === 0 && (
          <section className="usage-card col-span-2 animate-scale-in">
            <div className="flex flex-col gap-2 text-center text-slate-400">
              <h2 className="text-lg font-semibold text-white">No providers selected</h2>
              <p className="text-sm">Open settings to choose what you want to track.</p>
            </div>
          </section>
        )}
      </main>

      {!isSettingsOpen && (
        <RecentUsagesTable className="mt-6" />
      )}

      <ErrorPanel visible={!isSettingsOpen && !!errorMessage} message={errorMessage} />

      <Footer pollStartTime={pollStartTime} pollIntervalMs={pollIntervalMs} />
    </div>
  )
}
