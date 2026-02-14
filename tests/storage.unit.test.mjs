import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { loadConfig } from '../.test-dist/src/storage/configStore.js';
import {
    getToken,
    rotateEncryptionKey,
    storeToken,
} from '../.test-dist/src/storage/keychain.js';
import { getConfigDir, getConfigPath } from '../.test-dist/src/utils/paths.js';

const createSandbox = () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-storage-test-'));
    const configDir = path.join(rootDir, 'orbit-config');
    return { rootDir, configDir };
};

const applySandbox = (sandbox) => {
    process.env.ORBIT_CONFIG_DIR = sandbox.configDir;
};

test('loadConfig recovers from corrupt config files by quarantining the bad file', () => {
    const sandbox = createSandbox();
    applySandbox(sandbox);

    const configPath = getConfigPath();
    fs.mkdirSync(path.dirname(configPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(configPath, '{not-valid-json', 'utf-8');

    const config = loadConfig();
    assert.deepEqual(config, { providers: {} });

    const files = fs.readdirSync(getConfigDir());
    assert.ok(files.some((file) => file.startsWith('config.json.corrupt-')));

    fs.rmSync(sandbox.rootDir, { recursive: true, force: true });
});

test('rotateEncryptionKey preserves existing credentials', async () => {
    const sandbox = createSandbox();
    applySandbox(sandbox);

    await storeToken('vercel', 'team', 'token_team_abcdefghijklmnopqrstuvwxyz');
    const keyPath = path.join(getConfigDir(), '.key');
    const keyBefore = fs.readFileSync(keyPath, 'utf-8');

    await rotateEncryptionKey();

    const keyAfter = fs.readFileSync(keyPath, 'utf-8');
    assert.notEqual(keyBefore, keyAfter);

    const tokenAfter = await getToken('vercel', 'team');
    assert.equal(tokenAfter, 'token_team_abcdefghijklmnopqrstuvwxyz');

    fs.rmSync(sandbox.rootDir, { recursive: true, force: true });
});
