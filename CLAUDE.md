# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Structure

This is a **Turborepo + Bun workspaces** monorepo containing:

```
usage-app/
├── apps/
│   ├── desktop/          # Electron desktop app (@usage-app/desktop)
│   └── web/              # Astro landing page (@usage-app/web)
├── packages/             # Shared packages (future)
├── package.json          # Root workspace config
├── turbo.json            # Turborepo task config
└── tsconfig.json         # Base TypeScript config
```

## Build Commands

### Root-level (Turborepo)

```bash
bun install              # Install all dependencies

# Development
bun run dev              # Run all apps in parallel
bun run dev:desktop      # Run only Electron app
bun run dev:web          # Run only Astro landing page

# Building
bun run build            # Build all apps
bun run build:desktop    # Build only Electron app
bun run build:web        # Build only landing page

# Packaging (Electron)
bun run package          # Package for current platform
bun run package:mac      # Package for macOS (dmg + zip)
bun run package:win      # Package for Windows (NSIS + portable)
bun run package:linux    # Package for Linux (AppImage, deb, rpm)

# Quality
bun run test             # Run all tests
bun run typecheck        # TypeScript check all packages
bun run lint             # ESLint all packages
```

### Desktop App (apps/desktop)

```bash
cd apps/desktop
bun run dev              # Start Electron with HMR
bun run build            # Production build (outputs to /out)
bun run preview          # Preview production build
bun run test             # Unit tests (Vitest)
bun run test:ui          # Interactive Vitest UI
bun run test:coverage    # Unit tests with coverage
bun run test:e2e         # Playwright E2E tests
bun run lint             # ESLint check
bun run typecheck        # TypeScript type checking
```

### Landing Page (apps/web)

```bash
cd apps/web
bun run dev              # Astro dev server
bun run build            # Static build (outputs to /dist)
bun run preview          # Preview build
bun run typecheck        # Astro check
```

## Testing

Run a single test file:
```bash
cd apps/desktop
bun vitest run tests/unit/main.test.js
```

Run tests matching a pattern:
```bash
cd apps/desktop
bun vitest run -t "formatTimeRemaining"
```

## Architecture

### Desktop App (apps/desktop)

An Electron app that monitors API usage across three providers: Claude (Anthropic), Codex (OpenAI ChatGPT), and Cursor.

#### Process Structure

```
apps/desktop/
├── src/
│   ├── main/           # Electron main process
│   │   ├── index.ts    # Window creation, IPC handlers, polling
│   │   └── usage-service.ts  # API fetching for all providers
│   ├── preload/        # Context bridge (IPC security layer)
│   │   └── index.ts    # Exposes electronAPI to renderer
│   ├── renderer/       # React frontend
│   │   ├── App.tsx     # Main component with state management
│   │   ├── components/ # UI components (cards, settings, etc.)
│   │   ├── hooks/      # useUsageData, usePollingProgress, useCountdown
│   │   └── utils/      # Formatters (time, percentages)
│   └── types/          # TypeScript interfaces per provider
├── tests/              # Unit and E2E tests
├── resources/          # App icons and entitlements
└── electron-builder.config.ts  # Packaging configuration
```

#### IPC Communication

The preload script exposes `window.electronAPI.usage` with methods:
- `getUsage()`, `getPollInterval()`, `setPollInterval()`, `setCursorToken()`, `getRecentUsages()`
- `onUpdate(callback)` - returns unsubscribe function for real-time updates

Main process uses `ipcMain.handle()` for request-response, renderer subscribes via `ipcRenderer.on()`.

#### Provider API Integration

- **Claude**: OAuth token from macOS Keychain or `~/.claude/.credentials.json`
- **Codex**: Token from `~/.codex/auth.json`
- **Cursor**: User-configurable session token via settings panel

Polling uses `Promise.allSettled()` so provider failures are independent.

### Landing Page (apps/web)

An Astro static site with Tailwind CSS matching the desktop app's glassmorphic theme.

```
apps/web/
├── src/
│   ├── layouts/Layout.astro
│   ├── pages/index.astro
│   ├── components/
│   │   ├── Hero.astro
│   │   ├── Features.astro
│   │   ├── DownloadButtons.astro
│   │   ├── Screenshots.astro
│   │   └── Footer.astro
│   └── styles/global.css
└── public/
```

## Styling

Both apps use **Tailwind v4** with PostCSS. Custom theme variables are defined in `@theme` blocks:
- Desktop: `apps/desktop/src/renderer/styles.css`
- Web: `apps/web/src/styles/global.css`

Theme includes glassmorphic card design with backdrop blur, animated borders, and consistent colors (bg-deep, accent-1/2/3, provider colors).

## Key Patterns

- Each provider has its own TypeScript interface in `apps/desktop/src/types/`
- Error state included in all usage data types (providers fail independently)
- Console logs prefixed with `[Module]` for debugging
- Settings persisted to localStorage (poll interval, cursor token, tracking toggles)
- Turborepo caches build outputs for faster rebuilds
