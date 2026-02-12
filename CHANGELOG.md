# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
