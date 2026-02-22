![Orbit](./assets/orbit-header.gif)

**Orbit by AppUo**

Switch Vercel identities instantly.

No logout. No shell hacks. No credential mess.

[![npm](https://img.shields.io/npm/v/@appuo/orbit)](https://www.npmjs.com/package/@appuo/orbit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

---

> **AWS has named profiles. Why doesn't Vercel?**
>
> Orbit gives Vercel the same power. More providers coming soon.

```bash
orbit add vercel personal
orbit add vercel company

orbit use vercel company
vercel deploy              # deploys as company. done.

orbit use vercel personal
vercel deploy              # deploys as personal. instant.
```

**One command. Instant switch. No logout required.**

---

## 🎯 Current Support

| Provider | Status |
|----------|--------|
| **Vercel** | ✅ Fully supported |
| AWS | 🔜 Coming soon |
| Supabase | 🔜 Coming soon |
| Cloudflare | 🔜 Coming soon |

> Orbit is built with a **pluggable provider system**. Vercel is the first provider, with more on the way.

---

## 📦 Install

```bash
npm install -g @appuo/orbit
# or
pnpm add -g @appuo/orbit
```

---

## 🧾 Release & Changelog Flow

Use this flow to keep `CHANGELOG.md` updated on every change/release:

```bash
# 1) Add an entry while working
pnpm changelog:add -- --type changed --message "Improve profile auth rollback"

# 2) Bump version for release
npm version 1.0.9 --no-git-tag-version

# 3) Move [Unreleased] notes into the new version + validate
pnpm release:prepare

# 4) Publish to GitHub Packages
npm login --scope=@appuo --auth-type=legacy --registry=https://npm.pkg.github.com
pnpm release:publish

# One-command release (version bump + changelog + publish + commit/tag/push)
pnpm release:ship
# or explicit version:
pnpm release:ship -- --version 1.0.9
# run everything except git push:
pnpm release:ship -- --no-push
```

Optional npmjs publish:

```bash
pnpm release:publish:npm
```

`pnpm changelog:release` will fail if `[Unreleased]` has no entries, to prevent empty release notes.

---

## ⚡ 30-Second Setup

```bash
# Add your personal Vercel account
orbit add vercel personal
# → Detects existing Vercel login automatically
# → Or launches `vercel login` for you

# Add your work Vercel account
orbit add vercel company
# → Say "n" to detected token, login as different user

# Switch instantly
orbit use vercel company
vercel deploy --prod       # deploys as company

orbit use vercel personal
vercel whoami              # shows personal account
```

No `vercel logout`. No `vercel login`. Just switch and go.

---

## 📖 Commands

| Command | What it does |
|---------|-------------|
| `orbit add vercel <profile>` | Add Vercel account (guided login) |
| `orbit use vercel <profile>` | Switch identity instantly |
| `orbit list` | See all profiles + emails |
| `orbit exec vercel <cmd>` | Run with active profile |
| `orbit run vercel <profile> <cmd>` | Run with specific profile |
| `orbit current` | Show active profile |
| `orbit rotate-key` | Rotate local encryption key |
| `orbit remove vercel <profile>` | Remove a profile |

---

## 🧰 Global Flags

| Flag | Description |
|------|-------------|
| `--json` | Machine-readable output for automation |
| `--debug` | Redacted debug stack traces |

---

## 🔄 How It Works

When you run `orbit use vercel company`, Orbit:

1. **Snapshots** your current profile's `auth.json`
2. **Restores** the target profile's `auth.json`
3. **Done** — native `vercel` commands just work

No environment variable injection. No wrappers. The Vercel CLI reads its own auth file natively.

```
~/.orbit/
├── config.json              # Profile names + metadata (no secrets)
├── credentials.json         # Encrypted tokens (AES-256-GCM)
├── .key                     # Encryption key (chmod 600)
└── auth/
    └── vercel/
        ├── personal.json    # Auth snapshot
        └── company.json     # Auth snapshot
```

---

## 🔐 Security

- Tokens encrypted with **AES-256-GCM** at rest
- Credentials key and token store enforced at `chmod 600`
- Auth snapshots stored with `chmod 600`
- Config and auth directories enforced at `chmod 700`
- Corrupt config/credential files are quarantined before reset
- No secrets in config files
- No shell modifications (`.bashrc`, `.zshrc`)
- Zero native dependencies

---

## 🧯 Failure Modes & Recovery

- Missing auth snapshot during `orbit use`: command fails safely and does not change current profile.
- Missing auth snapshot during `orbit exec`/`orbit run`: Orbit falls back to token-scoped env execution.
- Corrupt `config.json` or `credentials.json`: file is moved to `*.corrupt-<timestamp>` and re-initialized.

See the full runbook in [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).

---

## 🖥️ Cross-Platform

| | macOS | Linux | Windows |
|--|-------|-------|---------|
| Auth swap | ✅ | ✅ | ✅ |
| Encrypted storage | ✅ | ✅ | ✅ |
| CLI execution | ✅ | ✅ | ✅ |

---

## 🗺️ Roadmap

Orbit is built on a pluggable provider architecture. Adding new cloud providers is straightforward.

**Coming Soon:**

- [ ] **AWS Provider** — Named profiles for AWS CLI
- [ ] **Supabase Provider** — Multi-project switching
- [ ] **Cloudflare Provider** — Workers + Pages account switching
- [ ] **Railway Provider** — Multi-team support
- [ ] **Netlify Provider** — Account switching
- [ ] **Profile import/export** — Migrate between machines
- [ ] **Shell completions** — bash, zsh, fish, PowerShell

> **Want a provider?** [Open an issue](https://github.com/appuo/orbit/issues) →

---

## 🛠️ Development

```bash
git clone https://github.com/appuo/orbit.git
cd orbit && pnpm install
pnpm build
npm link
orbit --version
```

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## 📚 Additional Docs

- [Migration Guide](docs/MIGRATION.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## 📄 License

MIT — see [LICENSE](LICENSE).
