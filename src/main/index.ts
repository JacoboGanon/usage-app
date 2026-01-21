import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { getUsageUpdate, startPolling, stopPolling, getPollInterval, setPollInterval, setCursorToken, getCursorToken, initCursorToken } from './usage-service'
import { getRecentUsages } from './recent-usage-service'

let mainWindow: BrowserWindow | null = null

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

ipcMain.handle('get-recent-usages', async (_event, limit?: number) => {
  return await getRecentUsages(limit)
})

app.whenReady().then(async () => {
  // Initialize stored cursor token before creating window
  await initCursorToken()

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
