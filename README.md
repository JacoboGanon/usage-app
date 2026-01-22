# Usage Console

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-40-47848F.svg)](https://www.electronjs.org/)
[![Turborepo](https://img.shields.io/badge/Turborepo-2.5-EF4444.svg)](https://turbo.build/)

A beautiful desktop app to monitor your API usage and spending across all your AI coding tools.

## Features

- **Claude Usage** - Track your Anthropic API usage with detailed model breakdowns for Opus, Sonnet, and Haiku
- **ChatGPT / Codex** - Monitor your OpenAI ChatGPT Pro and Codex CLI usage with real-time updates
- **Cursor Tracking** - Keep tabs on your Cursor AI IDE usage with premium request monitoring
- **Reset Countdown** - Always know when your usage limits reset with live countdown timers
- **Auto-Refresh** - Configurable polling intervals keep your data fresh without manual refreshes
- **Beautiful UI** - Glassmorphic design with smooth animations and a dark theme

## Installation

### Download

Download the latest release for your platform from the [Releases](https://github.com/jacobo/usage-app/releases) page:

- **macOS** - `.dmg` (Universal: Intel + Apple Silicon)
- **Windows** - `.exe` (NSIS installer or portable)
- **Linux** - `.AppImage`, `.deb`, or `.rpm`

### Build from Source

Requirements:
- [Bun](https://bun.sh/) v1.3+
- Node.js 20+ (for Electron)

```bash
# Clone the repository
git clone https://github.com/jacobo/usage-app.git
cd usage-app

# Install dependencies
bun install

# Run in development mode
bun run dev:desktop

# Build for production
bun run build:desktop

# Package for your platform
bun run package:mac    # macOS
bun run package:win    # Windows
bun run package:linux  # Linux
```

## Monorepo Structure

This project uses **Turborepo + Bun workspaces**:

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

## Development

### Commands

```bash
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

### Configuration

The app reads API tokens from the following locations:

| Provider | Token Location |
|----------|----------------|
| Claude | macOS Keychain or `~/.claude/.credentials.json` |
| Codex | `~/.codex/auth.json` |
| Cursor | Configurable via Settings panel in the app |

## Tech Stack

- **Desktop App**: Electron + React + TypeScript + Tailwind CSS v4
- **Landing Page**: Astro + Tailwind CSS v4
- **Build Tools**: Turborepo, Bun, electron-vite, electron-builder
- **Testing**: Vitest, Playwright

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Made with Claude Code
