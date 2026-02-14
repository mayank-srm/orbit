# Troubleshooting

## `orbit use` fails with "No saved auth snapshot found"

Cause: The target profile does not have a local auth snapshot.

Fix:

1. Re-add the profile to capture auth:
   - `orbit add vercel <profile>`
2. Retry:
   - `orbit use vercel <profile>`

## `orbit exec` falls back to token mode

Cause: Snapshot restore failed for the active profile.

Fix:

1. Re-capture snapshot:
   - `orbit add vercel <profile>`
2. Verify identity:
   - `orbit exec vercel whoami`

## Credentials appear lost after corruption warning

Cause: Orbit quarantined a corrupt file and reset state.

Fix:

1. Locate backup files in `~/.orbit` (or `ORBIT_CONFIG_DIR`):
   - `config.json.corrupt-<timestamp>`
   - `credentials.json.corrupt-<timestamp>`
2. Restore manually if valid, then rerun command.

## Debugging command failures

Run with:

- `orbit --debug <command>`

Debug stacks are redacted to avoid leaking tokens.

## Machine-readable output

Use:

- `orbit --json <command>`

Recommended for CI and scripts.
