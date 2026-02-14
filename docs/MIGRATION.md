# Migration Guide

## Migrating to 1.0.7+

Orbit now enforces stricter auth consistency and storage hardening.

## What changed

1. `orbit use` now requires a saved auth snapshot for the target profile.
2. `orbit exec` and `orbit run` fail safe:
   - Native auth swap is used only when snapshot restore succeeds.
   - If restore fails, Orbit falls back to token-scoped execution.
3. Profile removal now deletes auth snapshots and stale metadata.
4. Config and credential files are written atomically and hardened with secure permissions.
5. New command: `orbit rotate-key`.

## Recommended migration steps

1. Re-capture auth snapshots for existing profiles:
   - `orbit add vercel <profile>`
2. Validate active profile resolution:
   - `orbit current`
   - `orbit exec vercel whoami`
3. Rotate local encryption key (optional but recommended):
   - `orbit rotate-key`
4. If automation is used, switch to JSON mode:
   - `orbit --json list`

## Corrupt state recovery

If Orbit detects invalid `config.json` or `credentials.json`, it keeps a backup as:

- `config.json.corrupt-<timestamp>`
- `credentials.json.corrupt-<timestamp>`

Then Orbit initializes a clean file so commands can continue.
