import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { addProfile, loadConfig, setCurrentProfile } from '../.test-dist/src/storage/configStore.js';
import { storeToken } from '../.test-dist/src/storage/keychain.js';
import { ensureAuthDir, getAuthFilePath } from '../.test-dist/src/utils/paths.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const orbitEntry = path.join(repoRoot, 'dist', 'index.js');

const createFakeVercel = (binDir) => {
    const programPath = path.join(binDir, 'vercel.js');
    const program = `'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const xdgDataHome = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
const authPath = path.join(xdgDataHome, 'com.vercel.cli', 'auth.json');

let authToken = '';
if (fs.existsSync(authPath)) {
  try {
    const raw = fs.readFileSync(authPath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (typeof parsed.token === 'string') authToken = parsed.token;
  } catch {}
}

const tokenArgIndex = process.argv.indexOf('--token');
const tokenFromArg = tokenArgIndex >= 0 ? (process.argv[tokenArgIndex + 1] || '') : '';
const resolvedToken = tokenFromArg || process.env.VERCEL_TOKEN || authToken || '';
const isInvalidToken = resolvedToken.toLowerCase().includes('invalid');
if (process.argv.includes('whoami')) {
  if (!resolvedToken) {
    process.stderr.write('No existing credentials found. Please log in.\\n');
    process.exit(1);
  }
  if (isInvalidToken) {
    process.stderr.write('Error: The specified token is not valid.\\n');
    process.exit(1);
  }
  process.stdout.write(resolvedToken + '\\n');
  process.exit(0);
}

if (process.argv.includes('fail-exit')) {
  process.exit(5);
}

process.stdout.write(resolvedToken + '\\n');
`;
    fs.writeFileSync(programPath, program, { encoding: 'utf-8', mode: 0o755 });

    const unixWrapperPath = path.join(binDir, 'vercel');
    const unixWrapper = `#!/usr/bin/env sh
node "$(dirname "$0")/vercel.js" "$@"
`;
    fs.writeFileSync(unixWrapperPath, unixWrapper, { encoding: 'utf-8', mode: 0o755 });

    const windowsWrapperPath = path.join(binDir, 'vercel.cmd');
    const windowsWrapper = '@echo off\r\nnode "%~dp0\\vercel.js" %*\r\n';
    fs.writeFileSync(windowsWrapperPath, windowsWrapper, { encoding: 'utf-8' });
};

const createSandbox = () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-test-'));
    const configDir = path.join(rootDir, 'orbit-config');
    const xdgDataHome = path.join(rootDir, 'xdg-data');
    const binDir = path.join(rootDir, 'bin');
    fs.mkdirSync(binDir, { recursive: true, mode: 0o700 });
    createFakeVercel(binDir);

    return {
        rootDir,
        configDir,
        xdgDataHome,
        env: {
            ...process.env,
            ORBIT_CONFIG_DIR: configDir,
            XDG_DATA_HOME: xdgDataHome,
            PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
            NO_COLOR: '1',
        },
    };
};

const applySandbox = (sandbox) => {
    process.env.ORBIT_CONFIG_DIR = sandbox.configDir;
    process.env.XDG_DATA_HOME = sandbox.xdgDataHome;
};

const writeRuntimeAuth = (sandbox, token) => {
    const authPath = path.join(
        sandbox.xdgDataHome,
        'com.vercel.cli',
        'auth.json',
    );
    fs.mkdirSync(path.dirname(authPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(authPath, JSON.stringify({ token }), {
        encoding: 'utf-8',
        mode: 0o600,
    });
};

const writeSnapshot = (profile, token) => {
    ensureAuthDir('vercel');
    const snapshotPath = getAuthFilePath('vercel', profile);
    fs.writeFileSync(snapshotPath, JSON.stringify({ token }), {
        encoding: 'utf-8',
        mode: 0o600,
    });
    return snapshotPath;
};

const runOrbit = (sandbox, args, input = '') => {
    return spawnSync(process.execPath, [orbitEntry, ...args], {
        env: sandbox.env,
        encoding: 'utf-8',
        input,
    });
};

const runVercel = (sandbox, args) => {
    return spawnSync('vercel', args, {
        env: sandbox.env,
        encoding: 'utf-8',
    });
};

const getLastLine = (output) => {
    return output
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .at(-1);
};

test('orbit use does not switch current profile when snapshot is missing', async (t) => {
    const sandbox = createSandbox();
    t.after(() => {
        fs.rmSync(sandbox.rootDir, { recursive: true, force: true });
    });
    applySandbox(sandbox);

    addProfile('vercel', 'personal');
    addProfile('vercel', 'company');
    setCurrentProfile('vercel', 'personal');
    await storeToken('vercel', 'personal', 'token_personal_abcdefghijklmnopqrstuvwxyz');
    await storeToken('vercel', 'company', 'token_company_abcdefghijklmnopqrstuvwxyz');
    writeSnapshot('personal', 'personal_runtime_token');
    writeRuntimeAuth(sandbox, 'personal_runtime_token');

    const result = runOrbit(sandbox, ['use', 'vercel', 'company']);

    assert.notEqual(result.status, 0, `stderr:\n${result.stderr}`);
    assert.match(result.stderr, /No saved auth snapshot/i);
    const config = loadConfig();
    assert.equal(config.providers.vercel?.current, 'personal');
});

test('orbit exec falls back to token when auth snapshot restore fails', async (t) => {
    const sandbox = createSandbox();
    t.after(() => {
        fs.rmSync(sandbox.rootDir, { recursive: true, force: true });
    });
    applySandbox(sandbox);

    addProfile('vercel', 'company');
    setCurrentProfile('vercel', 'company');
    const token = 'token_company_abcdefghijklmnopqrstuvwxyz';
    await storeToken('vercel', 'company', token);
    writeRuntimeAuth(sandbox, 'stale_runtime_token');

    const result = runOrbit(sandbox, ['exec', 'vercel', 'whoami']);

    assert.equal(result.status, 0, `stderr:\n${result.stderr}`);
    assert.equal(getLastLine(result.stdout), token);
});

test('orbit use rolls back when restored auth is invalid', async (t) => {
    const sandbox = createSandbox();
    t.after(() => {
        fs.rmSync(sandbox.rootDir, { recursive: true, force: true });
    });
    applySandbox(sandbox);

    const personalToken = 'token_personal_abcdefghijklmnopqrstuvwxyz';
    const invalidCompanyToken = 'invalid_company_abcdefghijklmnopqrstuvwxyz';

    addProfile('vercel', 'personal');
    addProfile('vercel', 'company');
    setCurrentProfile('vercel', 'personal');
    await storeToken('vercel', 'personal', personalToken);
    await storeToken('vercel', 'company', invalidCompanyToken);

    writeSnapshot('personal', personalToken);
    writeSnapshot('company', invalidCompanyToken);
    writeRuntimeAuth(sandbox, personalToken);

    const result = runOrbit(sandbox, ['use', 'vercel', 'company']);

    assert.notEqual(result.status, 0, `stderr:\n${result.stderr}`);
    assert.match(result.stderr, /invalid or expired/i);
    const config = loadConfig();
    assert.equal(config.providers.vercel?.current, 'personal');

    const whoamiResult = runVercel(sandbox, ['whoami']);
    assert.equal(whoamiResult.status, 0, `stderr:\n${whoamiResult.stderr}`);
    assert.equal(getLastLine(whoamiResult.stdout), personalToken);
});

test('orbit remove deletes snapshot and clears removed profile metadata', async (t) => {
    const sandbox = createSandbox();
    t.after(() => {
        fs.rmSync(sandbox.rootDir, { recursive: true, force: true });
    });
    applySandbox(sandbox);

    addProfile('vercel', 'personal', { email: 'personal@example.com' });
    addProfile('vercel', 'company', { email: 'company@example.com' });
    setCurrentProfile('vercel', 'personal');
    await storeToken('vercel', 'company', 'token_company_abcdefghijklmnopqrstuvwxyz');
    const snapshotPath = writeSnapshot('company', 'company_runtime_token');

    const result = runOrbit(sandbox, ['remove', 'vercel', 'company']);

    assert.equal(result.status, 0, `stderr:\n${result.stderr}`);
    assert.equal(fs.existsSync(snapshotPath), false);

    const config = loadConfig();
    assert.deepEqual(config.providers.vercel?.profiles, ['personal']);
    assert.equal(config.providers.vercel?.metadata?.['company'], undefined);
    assert.equal(
        config.providers.vercel?.metadata?.['personal']?.email,
        'personal@example.com',
    );
});

test('orbit --json list emits machine-readable data', (t) => {
    const sandbox = createSandbox();
    t.after(() => {
        fs.rmSync(sandbox.rootDir, { recursive: true, force: true });
    });
    applySandbox(sandbox);

    addProfile('vercel', 'personal', { email: 'personal@example.com' });
    setCurrentProfile('vercel', 'personal');

    const result = runOrbit(sandbox, ['--json', 'list']);

    assert.equal(result.status, 0, `stderr:\n${result.stderr}`);
    const payload = JSON.parse(result.stdout.trim());
    assert.equal(payload.ok, true);
    assert.equal(payload.providers[0].provider, 'vercel');
    assert.equal(payload.providers[0].profiles[0].name, 'personal');
});
