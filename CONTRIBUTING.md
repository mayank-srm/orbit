# Contributing to Orbit

Thank you for your interest in contributing to Orbit! 🌍

## Getting Started

1. **Fork the repository**
2. **Clone your fork**
   ```bash
   git clone https://github.com/your-username/orbit.git
   cd orbit
   ```
3. **Install dependencies**
   ```bash
   pnpm install
   ```
4. **Build the project**
   ```bash
   pnpm build
   ```

## Development

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Commands

```bash
pnpm build       # Build the project
pnpm dev         # Build with watch mode
pnpm typecheck   # Run TypeScript type checking
pnpm test        # Build + run integration/unit tests
pnpm release:check   # Release readiness checks
```

### Code Standards

- **TypeScript Strict Mode** — No `any` types allowed
- **ESM Only** — No CommonJS imports
- **No `console.log`** — Use the `logger` utility from `src/utils/logger.ts`
- **Cross-platform** — Use `os.homedir()`, `path.join()`, and `execa`
- **Zod validation** — All external input must be validated
- **Fail-safe auth** — Never run native provider CLI when auth identity cannot be verified

### Test Requirements

- Any change in command behavior must include or update integration tests in `tests/*.test.mjs`
- Any change in storage/security behavior must include or update unit coverage
- Pull requests must pass:
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm release:check`

### Adding a New Provider

1. Create a new file in `src/providers/` (e.g., `aws.ts`)
2. Implement the `Provider` interface from `provider.interface.ts`
3. Register it in `src/index.ts` using `registerProvider()`

```typescript
import type { Provider } from './provider.interface.js';

export const awsProvider: Provider = {
  name: 'aws',
  getEnvVar(): string { return 'AWS_ACCESS_KEY_ID'; },
  getCliName(): string { return 'aws'; },
  validateToken(token: string): boolean { return token.length > 10; },
};
```

## Pull Requests

1. Create a feature branch from `main`
2. Make your changes
3. Ensure `pnpm typecheck` passes
4. Ensure `pnpm test` passes
5. Ensure `pnpm release:check` succeeds
6. Write a clear PR description

## Reporting Issues

- Use GitHub Issues
- Include your OS, Node.js version, and Orbit version
- Provide steps to reproduce

## Code of Conduct

Be respectful. Be constructive. Be inclusive.
