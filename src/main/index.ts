import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { getUsageUpdate, startPolling, stopPolling, getPollInterval, setPollInterval, setCursorToken, getCursorToken, initCursorToken, refreshProvider, type ProviderName } from './usage-service'
import { getRecentUsages, setAppStartTime } from './recent-usage-service'
import type { UsageFilterMode, ProviderFilter } from '../types/usage'

let mainWindow: BrowserWindow | null = null

// Track when the app started for session filtering
const appStartedAt = new Date()

function createWindow() {
  const preloadPath = join(__dirname, '../preload/index.mjs')

  console.log('[Main] Creating window...')
  console.log('[Main] Preload path:', preloadPath)
  console.log('[Main] Preload exists:', existsSync(preloadPath))

  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    webPreferences: {
      preload: preloadPath,
      sandbox: false
    }
  })

  // Load the renderer
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL!)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Start usage polling when window is ready
  mainWindow.webContents.on('did-finish-load', () => {
    startPolling((update) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('usage-update', update)
      }
    })
  })

  mainWindow.on('closed', () => {
    stopPolling()
    mainWindow = null
  })
}

// IPC Handlers
ipcMain.handle('get-usage', async () => {
  return await getUsageUpdate()
})

ipcMain.handle('get-poll-interval', () => {
  return getPollInterval()
})

ipcMain.handle('set-poll-interval', (_event, nextIntervalMs: number) => {
  return setPollInterval(nextIntervalMs)
})

ipcMain.handle('set-cursor-token', async (_event, token: string | null) => {
  await setCursorToken(token)
  return true
})

ipcMain.handle('get-cursor-token', () => {
  return getCursorToken()
})

ipcMain.handle('get-recent-usages', async (_event, page?: number, pageSize?: number, filterMode?: UsageFilterMode, providers?: ProviderFilter) => {
  return await getRecentUsages(page, pageSize, filterMode, providers)
})

ipcMain.handle('refresh-provider', async (_event, provider: ProviderName) => {
  const update = await refreshProvider(provider)
  // Also broadcast the update to keep the UI in sync
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('usage-update', update)
  }
  return update
})

app.whenReady().then(async () => {
  // Initialize stored cursor token before creating window
  await initCursorToken()

  // Set app start time for session filtering
  setAppStartTime(appStartedAt)

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
