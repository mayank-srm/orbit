# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added


### Changed


### Fixed


## [1.0.9] - 2026-02-22

### Changed

- `orbit use` now validates target Vercel auth before marking a profile as current.
- `orbit use` now attempts token-based auth recovery and rolls back to the previous profile on failure.
- Vercel auth path now honors `XDG_DATA_HOME` override on all platforms for isolated/sandboxed environments.

### Fixed

- Prevented profile/auth drift where `orbit use` reported success but `vercel whoami` resolved to a different account.
- Added integration coverage for invalid-token restore rollback behavior.

## [1.0.8] - 2026-02-17

### Added

- CI matrix for macOS/Linux/Windows across Node 18/20/22
- Release validation workflow with signed-tag verification
- Integration and storage unit tests using Node test runner
- `orbit rotate-key` command
- `--json` and `--debug` global flags
- Troubleshooting and migration documentation

### Changed

- `orbit use` now fails safely when profile auth snapshot is missing
- `orbit exec` and `orbit run` now use fail-safe identity fallback rules
- Config and credentials now use atomic file writes
- Config/credential corruption is quarantined before reset
- Profile removal now deletes auth snapshots and stale metadata

## [1.0.7] - 2026-02-14

### Added

- Stable Vercel profile switching and command execution flows
- Encrypted local credential storage
- Snapshot-based auth swap for Vercel CLI

## [1.0.0] - 2026-02-12

### Added

- 🌍 Initial release of Orbit CLI
- `orbit add <provider> <profile>` — Add cloud provider profiles with secure token input
- `orbit list` — Display all profiles in a formatted table
- `orbit remove <provider> <profile>` — Remove profiles and their tokens
- `orbit use <provider> <profile>` — Set the current active profile
- `orbit run <provider> <profile> -- <command>` — Run commands with a specific profile
- `orbit exec <provider> <command>` — Execute commands with the current active profile
- `orbit current` — Show current active profiles
- 🔐 Secure token storage via OS keychain (Keytar)
- 🔌 Vercel provider with token validation
- 🖥️ Cross-platform support (macOS, Linux, Windows)
- 📦 ESM-only build with tsup
- 📚 Open source documentation (README, LICENSE, CONTRIBUTING, SECURITY)
