# Repository Guidelines

## Project Structure & Module Organization
- `apps/desktop/` houses the Electron app. Key areas: `src/main/` (main process), `src/preload/`, `src/renderer/` (React UI), and `tests/` (unit + E2E).
- `apps/web/` contains the Astro landing page.
- `packages/` is reserved for shared packages.
- Root configs: `package.json`, `turbo.json`, `tsconfig.json`.

## Build, Test, and Development Commands
- `bun install`: install workspace dependencies.
- `bun run dev`: run all apps in parallel.
- `bun run dev:desktop` / `bun run dev:web`: run the Electron app or Astro site.
- `bun run build` / `bun run build:desktop` / `bun run build:web`: build all or a specific app.
- `bun run package:mac|win|linux`: package the desktop app for a target OS.
- `bun run lint` / `bun run typecheck` / `bun run test`: quality checks across the repo.

## Coding Style & Naming Conventions
- TypeScript-first codebase; keep functions focused and naming descriptive.
- Follow existing formatting and ESLint rules; run `bun run lint` before PRs.
- Tests use `.test` naming (see `apps/desktop/tests/`).

## Testing Guidelines
- Frameworks: Vitest for unit tests, Playwright for E2E (desktop).
- Run all tests: `bun run test`.
- Coverage/E2E (from `apps/desktop`): `bun run test:coverage`, `bun run test:e2e`.

## Commit & Pull Request Guidelines
- Commit messages in Git history use imperative, short summaries (e.g., `Add usage charts...`, `Fix usage parsing...`).
- PRs should include a clear description, steps to verify, and screenshots for UI changes.
- Run `bun run lint`, `bun run typecheck`, and `bun run test` before opening a PR.

## Security & Configuration Notes
- Local tokens are read from provider-specific locations (e.g., `~/.codex/auth.json`); do not commit secrets.
- For desktop settings, follow existing storage patterns (safeStorage + localStorage).

## Release Process (Desktop App)
- Recommended: tag a version and push it to trigger the release workflow.\n  Example: `git tag v1.2.3 && git push origin v1.2.3`.\n- Alternative: GitHub Actions → Release → Run workflow with a version number.\n- The workflow builds macOS/Windows/Linux and creates a draft release; publish it after review.\n- Signed builds require repo secrets: `MAC_CERTIFICATE`, `MAC_CERTIFICATE_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`, `WIN_CERTIFICATE`, `WIN_CERTIFICATE_PASSWORD`.
