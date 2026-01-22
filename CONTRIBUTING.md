# Contributing to Usage Console

Thank you for your interest in contributing to Usage Console! This document provides guidelines and instructions for contributing.

## License

By contributing to Usage Console, you agree that your contributions will be licensed under the [MIT License](LICENSE). This means any code, documentation, or other materials you submit become part of the project under the same license terms.

## How to Contribute

### Reporting Bugs

Before creating a bug report, please check existing issues to avoid duplicates. When creating a bug report, include:

- A clear, descriptive title
- Steps to reproduce the issue
- Expected behavior vs actual behavior
- Your environment (OS, app version, Node.js version)
- Screenshots if applicable
- Any relevant logs from the developer console

### Suggesting Features

Feature requests are welcome! Please include:

- A clear description of the feature
- The problem it solves or use case it addresses
- Any alternative solutions you've considered

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Install dependencies**: `bun install`
3. **Make your changes** following our coding standards
4. **Test your changes**: `bun run test`
5. **Lint your code**: `bun run lint`
6. **Type check**: `bun run typecheck`
7. **Commit your changes** with a clear, descriptive message
8. **Push to your fork** and open a Pull Request

## Development Setup

### Prerequisites

- [Bun](https://bun.sh/) v1.3+
- Node.js 20+ (for Electron)
- Git

### Getting Started

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/usage-app.git
cd usage-app

# Install dependencies
bun install

# Run in development mode
bun run dev:desktop

# Run tests
bun run test

# Type check
bun run typecheck

# Lint
bun run lint
```

## Project Structure

```
usage-app/
├── apps/
│   ├── desktop/          # Electron desktop app
│   │   ├── src/
│   │   │   ├── main/     # Main process
│   │   │   ├── preload/  # Preload scripts
│   │   │   └── renderer/ # React frontend
│   │   └── tests/        # Unit and E2E tests
│   └── web/              # Astro landing page
└── packages/             # Shared packages
```

## Coding Standards

- Use TypeScript for all new code
- Follow existing code style and patterns
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions focused and small

## Commit Messages

Write clear, concise commit messages:

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Keep the first line under 72 characters
- Reference issues when applicable

Examples:
- `Add Cursor usage tracking support`
- `Fix token refresh logic for Claude API`
- `Update README with new installation steps`

## Testing

- Write tests for new features
- Ensure existing tests pass before submitting PR
- Test on your target platform(s)

```bash
# Run unit tests
bun run test

# Run with coverage
cd apps/desktop && bun run test:coverage

# Run E2E tests
cd apps/desktop && bun run test:e2e
```

## Questions?

Feel free to open an issue for any questions about contributing.

Thank you for contributing!
