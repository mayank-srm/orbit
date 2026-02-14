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

- Tokens are encrypted at rest with **AES-256-GCM**
- Encryption key is stored in `~/.orbit/.key` (mode `600`)
- Encrypted credentials are stored in `~/.orbit/credentials.json` (mode `600`)
- Auth snapshots are stored per profile in `~/.orbit/auth/<provider>/<profile>.json` (mode `600`)
- Config/auth directories are enforced at mode `700`
- Tokens are **never** logged to stdout or stderr
- The config file (`~/.orbit/config.json`) contains **only metadata**, no secrets

### Runtime Security

- Tokens are injected as environment variables only for child process execution
- Token environment variables are scoped to the child process only
- The parent process environment is never modified
- All user input is validated using Zod schemas
- Native auth execution is used only when snapshot restore succeeds

### Input Validation

- Provider and profile names are validated against strict patterns
- Token format is validated per-provider before storage
- Config file contents are validated with Zod on every read

## Threat Model

### In scope

- Local at-rest credential disclosure from accidental file exposure
- Unsafe profile switching causing identity drift
- Corrupt local state causing undefined runtime behavior

### Out of scope

- Full-host compromise or malware with user-level file access
- Compromised provider APIs or CLI binaries
- User-controlled shell scripts executed after Orbit exits

## Defensive Controls

- Atomic writes for config and credential stores
- Corrupt file quarantine (`*.corrupt-<timestamp>`) before reset
- Fail-safe profile switching: current profile is not updated when restore fails
- Redacted debug diagnostics (`--debug`) to avoid token leaks
