# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Structure

This is a **Turborepo + Bun workspaces** monorepo with two apps:
- `apps/desktop` - Electron desktop app (@usage-app/desktop)
- `apps/web` - Astro landing page (@usage-app/web)

## Build Commands

```bash
bun install              # Install all dependencies

# Development (DO NOT run dev servers - user manages these)
bun run dev:desktop      # Electron app with HMR
bun run dev:web          # Astro landing page

# Building
bun run build            # Build all apps
bun run build:desktop    # Electron app only (outputs to apps/desktop/out)
bun run build:web        # Astro site only (outputs to apps/web/dist)

# Packaging (Electron)
bun run package:mac      # macOS (dmg + zip)
bun run package:win      # Windows (NSIS + portable)
bun run package:linux    # Linux (AppImage, deb, rpm)

# Quality
bun run test             # All tests
bun run typecheck        # TypeScript check all packages
bun run lint             # ESLint all packages
```

## Releasing

Two ways to release a new version of the desktop app:

**Option 1: Push a Git Tag (Recommended)**
```bash
git tag v1.0.0
git push origin v1.0.0
```

**Option 2: Manual Dispatch**
Go to Actions → Release → Run workflow on GitHub and enter a version number.

The workflow runs tests, builds for macOS/Windows/Linux in parallel, and creates a **draft release** with all artifacts. Go to Releases on GitHub to review and publish.

For signed builds, add these repo secrets:
- macOS: `MAC_CERTIFICATE`, `MAC_CERTIFICATE_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`
- Windows: `WIN_CERTIFICATE`, `WIN_CERTIFICATE_PASSWORD`

## Testing

```bash
# From apps/desktop directory
bun vitest run tests/unit/main.test.js           # Single test file
bun vitest run -t "formatTimeRemaining"          # Tests matching pattern
bun run test:e2e                                  # Playwright E2E tests
```

## Architecture

### Desktop App (apps/desktop)

Electron app monitoring API usage for Claude, Codex (OpenAI ChatGPT), and Cursor.

#### Main Process Services

- `src/main/index.ts` - Window creation, IPC handlers, polling lifecycle
- `src/main/usage-service.ts` - Real-time API fetching for all three providers
- `src/main/recent-usage-service.ts` - Historical usage parsing from local files, chart data aggregation, LiteLLM pricing lookups

#### IPC API

The preload script exposes `window.electronAPI.usage`:
- `getUsage()`, `getPollInterval()`, `setPollInterval()`, `getCursorToken()`, `setCursorToken()`
- `getRecentUsages(page, pageSize, filterMode, providers)` - Paginated historical data
- `getChartData(filterMode, providers)` - Aggregated data for Recharts
- `refreshProvider(provider)` - Force refresh a single provider
- `onUpdate(callback)` - Real-time updates (returns unsubscribe function)

#### Provider Token Locations

| Provider | Token Source |
|----------|--------------|
| Claude | macOS Keychain (tries multiple service names) → `~/.claude/.credentials.json` |
| Codex | `~/.codex/auth.json` |
| Cursor | User-configurable via Settings (stored encrypted with Electron safeStorage) |

Claude also checks XDG config path (`~/.config/claude/`) for usage history.

#### Data Flow

1. Polling uses `Promise.allSettled()` so provider failures are independent
2. Main process broadcasts updates via `mainWindow.webContents.send('usage-update', data)`
3. Renderer subscribes via `ipcRenderer.on()` with cleanup on unmount

### Landing Page (apps/web)

Static Astro site with Tailwind v4, matching the desktop app's glassmorphic design.

## Styling

Both apps use **Tailwind v4** with custom `@theme` blocks defining glassmorphic variables:
- Desktop: `apps/desktop/src/renderer/styles.css`
- Web: `apps/web/src/styles/global.css`

## Key Patterns

- Each provider has its own TypeScript interface in `apps/desktop/src/types/usage.ts`
- Error state included in all usage data types (providers fail independently)
- Console logs prefixed with `[Module]` for debugging (e.g., `[CursorToken]`)
- Settings persisted to localStorage (poll interval, tracking toggles)
- Cursor token encrypted with Electron's safeStorage API
