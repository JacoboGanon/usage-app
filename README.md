# Usage App

A desktop application for monitoring API usage across multiple AI coding assistant providers: **Claude** (Anthropic), **Codex** (ChatGPT), and **Cursor**.

## Features

- **Real-time usage monitoring** - Track session and weekly usage limits across providers
- **Configurable polling** - Adjustable refresh interval (5s to 5min)
- **Provider selection** - Enable/disable tracking for individual providers
- **Recent usage history** - View recent API calls with token counts and costs
- **Secure credential handling** - Reads tokens from system keychain and encrypted storage

## Installation

```bash
bun install
```

## Development

```bash
bun run dev          # Start with hot reload
bun run build        # Production build
bun run preview      # Preview production build
```

## Testing

```bash
bun test             # Unit tests (Vitest)
bun run test:ui      # Interactive test UI
bun run test:coverage # Coverage report
bun run test:e2e     # E2E tests (Playwright)
```

## Provider Setup

### Claude (Anthropic)

Credentials are automatically detected from:
1. **macOS Keychain** - Looks for Claude Code credentials
2. **Credentials file** - Falls back to `~/.claude/.credentials.json`

Log in to Claude Code CLI to set up credentials.

### Codex (ChatGPT)

Reads the access token from `~/.codex/auth.json`. Log in to the Codex CLI to set up credentials.

### Cursor

Requires manual configuration:
1. Open the app settings
2. Enter your Cursor session token (`WorkosCursorSessionToken` cookie value)

The token is stored securely using Electron's safeStorage encryption.

## Architecture

```
src/
  main/           # Electron main process
    index.ts      # Window creation, IPC handlers
    usage-service.ts   # API fetching for all providers
  preload/        # Context bridge (IPC security)
  renderer/       # React frontend
    App.tsx       # Main component
    components/   # Usage cards, settings panel
    hooks/        # useUsageData, usePollingProgress
    utils/        # Formatters
  types/          # TypeScript interfaces
```

## Tech Stack

- **Electron** - Desktop application framework
- **React 19** - UI library
- **Vite** - Build tool with HMR
- **Tailwind CSS v4** - Styling
- **Vitest** - Unit testing
- **Playwright** - E2E testing
