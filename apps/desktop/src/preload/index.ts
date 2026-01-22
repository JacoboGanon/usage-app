import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import type { UsageUpdate, RecentUsagesData, UsageChartData, ProviderName, UsageFilterMode, ProviderFilter } from '../types/usage'

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Example IPC methods
  sendMessage: (channel: string, data: unknown) => {
    const validChannels = ['toMain']
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data)
    }
  },
  onMessage: (channel: string, callback: (...args: unknown[]) => void) => {
    const validChannels = ['fromMain']
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event: IpcRendererEvent, ...args: unknown[]) => callback(...args))
    }
  },
  // App info
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  },

  // Usage API
  usage: {
    // Get current usage data
    getUsage: (): Promise<UsageUpdate> => ipcRenderer.invoke('get-usage'),

    // Get poll interval in milliseconds
    getPollInterval: (): Promise<number> => ipcRenderer.invoke('get-poll-interval'),

    // Set poll interval in milliseconds
    setPollInterval: (nextIntervalMs: number): Promise<number> => ipcRenderer.invoke('set-poll-interval', nextIntervalMs),

    // Subscribe to usage updates (called on the polling interval)
    onUpdate: (callback: (update: UsageUpdate) => void) => {
      const handler = (_event: IpcRendererEvent, update: UsageUpdate) => callback(update)
      ipcRenderer.on('usage-update', handler)
      // Return unsubscribe function
      return () => ipcRenderer.removeListener('usage-update', handler)
    },

    // Set Cursor session token
    setCursorToken: (token: string | null): Promise<boolean> => ipcRenderer.invoke('set-cursor-token', token),

    // Get Cursor session token
    getCursorToken: (): Promise<string | null> => ipcRenderer.invoke('get-cursor-token'),

    // Get recent usage data from local JSONL files with pagination and filtering
    getRecentUsages: (page?: number, pageSize?: number, filterMode?: UsageFilterMode, providers?: ProviderFilter): Promise<RecentUsagesData> => ipcRenderer.invoke('get-recent-usages', page, pageSize, filterMode, providers),

    // Get all usage data for charts (no pagination)
    getChartData: (filterMode?: UsageFilterMode, providers?: ProviderFilter): Promise<UsageChartData> => ipcRenderer.invoke('get-chart-data', filterMode, providers),

    // Refresh a specific provider's usage data
    refreshProvider: (provider: ProviderName): Promise<UsageUpdate> => ipcRenderer.invoke('refresh-provider', provider)
  }
})
