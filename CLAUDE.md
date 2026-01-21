# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
bun run dev              # Start development server with HMR
bun run build            # Production build (outputs to /out)
bun run preview          # Preview production build
bun run typecheck        # TypeScript type checking
bun run lint             # ESLint check
bun run lint:fix         # ESLint with auto-fix
```

## Testing

```bash
bun test                 # Run unit tests (Vitest)
bun run test:ui          # Interactive Vitest UI
bun run test:coverage    # Unit tests with coverage
bun run test:e2e         # Playwright E2E tests
```

Run a single test file:
```bash
bun vitest run tests/unit/main.test.js
```

Run tests matching a pattern:
```bash
bun vitest run -t "formatTimeRemaining"
```

## Architecture

This is an Electron app that monitors API usage across three providers: Claude (Anthropic), Codex (OpenAI ChatGPT), and Cursor.

### Process Structure

```
src/main/           # Electron main process
  index.ts          # Window creation, IPC handlers, polling lifecycle
  usage-service.ts  # API fetching for all providers

src/preload/        # Context bridge (IPC security layer)
  index.ts          # Exposes electronAPI to renderer

src/renderer/       # React frontend
  App.tsx           # Main component with state management
  components/       # UI components (cards, settings, etc.)
  hooks/            # useUsageData, usePollingProgress, useCountdown
  utils/            # Formatters (time, percentages)

src/types/          # TypeScript interfaces per provider
```

### IPC Communication

The preload script exposes `window.electronAPI.usage` with methods:
- `getUsage()`, `getPollInterval()`, `setPollInterval()`, `setCursorToken()`, `getRecentUsages()`
- `onUpdate(callback)` - returns unsubscribe function for real-time updates

Main process uses `ipcMain.handle()` for request-response, renderer subscribes via `ipcRenderer.on()`.

### Provider API Integration

- **Claude**: OAuth token from macOS Keychain or `~/.claude/.credentials.json`
- **Codex**: Token from `~/.codex/auth.json`
- **Cursor**: User-configurable session token via settings panel

Polling uses `Promise.allSettled()` so provider failures are independent.

### Styling

Tailwind v4 with PostCSS. Custom theme variables defined in `@theme` block in `src/renderer/styles.css`. Glassmorphic card design with backdrop blur and animated borders.

## Key Patterns

- Each provider has its own TypeScript interface in `src/types/`
- Error state included in all usage data types (providers fail independently)
- Console logs prefixed with `[Module]` for debugging
- Settings persisted to localStorage (poll interval, cursor token, tracking toggles)
