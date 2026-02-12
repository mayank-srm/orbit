# 🌍 Orbit

**A fully CLI-based multi-cloud profile manager.**

[![npm](https://img.shields.io/npm/v/@appuo/orbit)](https://www.npmjs.com/package/@appuo/orbit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

Orbit lets you manage multiple cloud provider accounts and switch between them instantly. No shell modifications. No global environment changes. No OS-specific hacks.

---

## Why Orbit?

If you deploy to **multiple Vercel accounts** (personal, company, client projects), switching between them is painful — you have to `vercel logout`, `vercel login`, verify email, wait...

Orbit fixes this:

```bash
orbit use vercel company
vercel deploy              # ← Deploys as company. Done.

orbit use vercel personal
vercel deploy              # ← Deploys as personal. Instant.
```

One command. Instant switch. Plain `vercel` commands just work.

---

## ✨ Features

- 🔄 **Instant Profile Switching** — `orbit use` swaps credentials natively, plain CLI commands work immediately
- 🔐 **Secure Token Storage** — Credentials stored in your OS keychain (Keychain / libsecret / Credential Vault)
- 🔑 **Integrated Login** — Orbit launches `vercel login` for you during setup, no manual token pasting
- 📧 **Email Display** — See which account each profile belongs to at a glance
- 🌐 **Multi-cloud Ready** — Extensible provider architecture (Vercel built-in, more coming)
- 🖥️ **Cross-platform** — macOS, Linux, and Windows
- ⚡ **Zero Config Pollution** — No `.bashrc`, `.zshrc`, or shell modifications

---

## 📦 Installation

### Global Install (Recommended)

```bash
npm install -g @appuo/orbit
```

or with pnpm:

```bash
pnpm add -g @appuo/orbit
```

### No Install (via npx)

```bash
npx @appuo/orbit list
npx @appuo/orbit add vercel personal
```

### From Source

```bash
git clone https://github.com/appuo/orbit.git
cd orbit
pnpm install
pnpm build
npm link
```

### Prerequisites

- **Node.js 18+**
- **Vercel CLI** installed globally (`npm i -g vercel`) for Vercel provider

---

## 🚀 Quick Start

### 1. Add your first account

```bash
orbit add vercel personal
```

Orbit will detect if you're already logged into Vercel CLI:

```
Found existing token (you@gmail.com) from vercel CLI. Use this? (Y/n) y
✔ Profile "personal" added for vercel.
```

If no token is found, Orbit will offer to log you in:

```
No existing credentials found. Login with vercel CLI now? (Y/n) y
  Visit vercel.com/device and enter XXXX-XXXX
  Congratulations! You are now signed in.
✔ New credentials found!
✔ Profile "personal" added for vercel.
```

### 2. Add a second account

```bash
orbit add vercel company
```

Orbit shows whose token it found, so you can decide:

```
Found existing token (you@gmail.com) from vercel CLI. Use this? (Y/n) n
Login to a different account with vercel CLI? (Y/n) y
  Visit vercel.com/device and enter YYYY-YYYY
  Congratulations! You are now signed in.
✔ New credentials found!
✔ Profile "company" added for vercel.
```

### 3. See all profiles

```bash
orbit list
```

```
  Provider        Profile              Email                          Status
  vercel          personal             you@gmail.com                  ★ current
  vercel          company              work@company.com               —
```

### 4. Switch instantly

```bash
orbit use vercel company
vercel deploy              # ← Deploys as company
vercel whoami              # ← Shows company account

orbit use vercel personal
vercel deploy              # ← Deploys as personal
```

No `vercel logout`. No `vercel login`. Just switch and go.

---

## 📖 Commands

| Command | Description |
|---------|-------------|
| `orbit add <provider> <profile>` | Add a new profile (with guided login) |
| `orbit list` | Show all profiles with email and status |
| `orbit use <provider> <profile>` | Switch active profile (swaps credentials) |
| `orbit exec <provider> <command...>` | Run command with the current profile |
| `orbit run <provider> <profile> <command...>` | Run command with a specific profile |
| `orbit current` | Show currently active profiles |
| `orbit remove <provider> <profile>` | Remove a profile and its credentials |

### `orbit add <provider> <profile>`

Add a new cloud provider profile. Orbit guides you through the process:

1. **Auto-discovery** — Checks for existing CLI credentials and shows the associated email
2. **Integrated login** — Offers to run `vercel login` if no credentials found or if you want a different account
3. **Manual token** — Falls back to secure token input if needed

```bash
orbit add vercel staging
```

### `orbit use <provider> <profile>`

Switch the active profile. This **swaps the provider's auth credentials** so that native CLI commands work immediately.

```bash
orbit use vercel company
# ✔ Now using profile "company" for vercel.

vercel deploy              # ← Runs as company, no wrapper needed!
```

### `orbit exec <provider> <command...>`

Execute a command using the current active profile.

```bash
orbit use vercel personal
orbit exec vercel deploy --prod
```

### `orbit run <provider> <profile> <command...>`

Run a command with a specific profile without changing the active selection.

```bash
orbit run vercel company deploy --prod
```

### `orbit list`

Display all profiles with provider, name, email, and active status.

```bash
orbit list
```

### `orbit current`

Show the currently active profile for each provider.

```bash
orbit current
# ✔ vercel: personal
```

### `orbit remove <provider> <profile>`

Remove a profile, its stored token, and auth snapshot.

```bash
orbit remove vercel staging
# ✔ Profile "staging" removed from vercel.
```

---

## 🏗️ How It Works

### Auth File Swap (the magic ✨)

When you run `orbit use vercel company`, Orbit:

1. **Saves** the current profile's `auth.json` to `~/.orbit/auth/vercel/personal.json`
2. **Restores** the target profile's `auth.json` from `~/.orbit/auth/vercel/company.json`
3. **Updates** the config to mark `company` as current

This means `vercel` CLI reads its own native `auth.json` — no environment variable hacks, no token injection. The CLI thinks you just logged in normally.

### Storage Architecture

```
~/.orbit/
├── config.json              # Profile names, current selections, metadata
└── auth/
    └── vercel/
        ├── personal.json    # Auth snapshot for personal profile
        └── company.json     # Auth snapshot for company profile
```

Tokens are additionally stored in your **OS keychain** via Keytar as a secure backup.

---

## 🖥️ Cross-Platform Support

| Feature | macOS | Linux | Windows |
|---------|-------|-------|---------|
| Keychain storage | ✅ Keychain | ✅ libsecret | ✅ Credential Vault |
| Auth file swap | ✅ | ✅ | ✅ |
| CLI execution | ✅ | ✅ | ✅ |
| Config storage | `~/.orbit/` | `~/.orbit/` | `%USERPROFILE%\.orbit\` |

Orbit uses `os.homedir()`, `path.join()`, and `execa` — no platform-specific hacks.

---

## 🔐 Security

### Token Storage

All tokens are stored in your OS's native keychain:

| OS | Backend |
|----|---------|
| macOS | Keychain |
| Linux | libsecret (GNOME Keyring) |
| Windows | Credential Vault |

**Tokens are never:**
- Written to plain text config files
- Logged to stdout/stderr
- Stored in environment variables permanently

### Config File

Only metadata is stored in `~/.orbit/config.json`:

```json
{
  "providers": {
    "vercel": {
      "profiles": ["personal", "company"],
      "current": "personal",
      "metadata": {
        "personal": { "email": "you@gmail.com" },
        "company": { "email": "work@company.com" }
      }
    }
  }
}
```

No secrets. No tokens. Just profile names, selections, and display metadata.

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 18+ |
| Language | TypeScript (strict mode) |
| Module System | ESM only |
| CLI Framework | Commander.js |
| Styling | Chalk |
| Spinners | Ora |
| Process Execution | Execa |
| Secure Storage | Keytar |
| Validation | Zod |
| Bundler | tsup |

---

## 🛠️ Development

```bash
# Clone and install
git clone https://github.com/appuo/orbit.git
cd orbit
pnpm install

# Build
pnpm build

# Type check
pnpm typecheck

# Watch mode
pnpm dev

# Link for local testing
npm link
orbit list
```

---

## 🗺️ Roadmap

- [ ] **AWS Provider** — Support for AWS CLI with named profiles
- [ ] **GCP Provider** — Google Cloud SDK integration
- [ ] **Azure Provider** — Azure CLI support
- [ ] **Netlify Provider** — Netlify CLI support
- [ ] **Profile import/export** — Migrate profiles between machines
- [ ] **Token rotation** — Automatic token refresh support
- [ ] **Shell completions** — Auto-complete for bash, zsh, fish, PowerShell
- [ ] **Plugin system** — Community-driven provider plugins

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.
