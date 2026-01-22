import type { UsageUpdate, RecentUsagesData, UsageChartData, ProviderName, UsageFilterMode, ProviderFilter } from './usage'

export interface ElectronAPI {
  sendMessage: (channel: string, data: unknown) => void
  onMessage: (channel: string, callback: (...args: unknown[]) => void) => void
  versions: {
    node: string
    chrome: string
    electron: string
  }
  usage: {
    getUsage: () => Promise<UsageUpdate>
    getPollInterval: () => Promise<number>
    setPollInterval: (nextIntervalMs: number) => Promise<number>
    onUpdate: (callback: (update: UsageUpdate) => void) => () => void
    setCursorToken: (token: string | null) => Promise<boolean>
    getCursorToken: () => Promise<string | null>
    getRecentUsages: (page?: number, pageSize?: number, filterMode?: UsageFilterMode, providers?: ProviderFilter) => Promise<RecentUsagesData>
    getChartData: (filterMode?: UsageFilterMode, providers?: ProviderFilter) => Promise<UsageChartData>
    refreshProvider: (provider: ProviderName) => Promise<UsageUpdate>
  }
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
