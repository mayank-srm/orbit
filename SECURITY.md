# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 1.x.x   | ✅ Active support  |

## Reporting a Vulnerability

If you discover a security vulnerability within Orbit, please report it responsibly:

1. **DO NOT** open a public GitHub issue
2. Email: **security@appuo.dev**
3. Include a detailed description of the vulnerability
4. Include steps to reproduce if possible

We will respond within 48 hours and work with you to resolve the issue.

## Security Architecture

### Token Storage

- All tokens are stored in the OS-native keychain via [Keytar](https://github.com/nicknisi/keytar)
  - **macOS**: Keychain
  - **Linux**: libsecret (GNOME Keyring)
  - **Windows**: Credential Vault
- Tokens are **never** written to disk in plain text
- Tokens are **never** logged to stdout or stderr
- The config file (`~/.orbit/config.json`) contains **only metadata**, no secrets

### Runtime Security

- Tokens are injected as environment variables **only** during command execution
- Token environment variables are scoped to the child process only
- The parent process environment is never modified
- All user input is validated using Zod schemas

### Input Validation

- Provider and profile names are validated against strict patterns
- Token format is validated per-provider before storage
- Config file contents are validated with Zod on every read
