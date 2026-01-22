import { test, expect, _electron as electron } from '@playwright/test'
import { join } from 'path'

let electronApp
let page

test.beforeAll(async () => {
  // Launch Electron app
  electronApp = await electron.launch({
    args: [join(process.cwd(), 'out/main/index.js')]
  })

  // Get the first window
  page = await electronApp.firstWindow()

  // Wait for the app to be ready
  await page.waitForLoadState('domcontentloaded')
})

test.afterAll(async () => {
  await electronApp.close()
})

test.describe('Usage App', () => {
  test('should display the app title', async () => {
    const title = await page.locator('h1')
    await expect(title).toHaveText('Usage App')
  })

  test('should display version information', async () => {
    const versions = await page.locator('#versions')
    await expect(versions).toBeVisible()
  })

  test('should have correct window title', async () => {
    const title = await page.title()
    expect(title).toBe('Usage App')
  })
})
