# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in Usage Console, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, please send an email to the maintainers with:

1. A description of the vulnerability
2. Steps to reproduce the issue
3. Potential impact of the vulnerability
4. Any suggested fixes (optional)

### What to Expect

- **Acknowledgment**: We will acknowledge receipt of your report within 48 hours
- **Updates**: We will provide updates on the status of your report
- **Resolution**: We aim to resolve critical vulnerabilities within 7 days
- **Credit**: We will credit you in the release notes (unless you prefer to remain anonymous)

## Security Best Practices

When using Usage Console:

- Keep the application updated to the latest version
- Do not share your API tokens or credentials
- The app stores tokens locally and never transmits them to third parties
- Review the permissions requested by the app

## Token Storage

Usage Console reads API tokens from:

- **Claude**: macOS Keychain or `~/.claude/.credentials.json`
- **Codex**: `~/.codex/auth.json`
- **Cursor**: User-configured in the app settings

These tokens are only used to query usage APIs and are never stored or transmitted elsewhere.
