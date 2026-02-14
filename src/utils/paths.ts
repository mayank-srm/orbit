import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { ensureFileMode } from './fileOps.js';

export const getConfigDir = (): string => {
    const overrideDir = process.env['ORBIT_CONFIG_DIR'];
    if (overrideDir && overrideDir.trim().length > 0) {
        return overrideDir;
    }
    return path.join(os.homedir(), '.orbit');
};

export const getConfigPath = (): string => {
    return path.join(getConfigDir(), 'config.json');
};

export const ensureConfigDir = (): void => {
    const dir = getConfigDir();
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
    ensureFileMode(dir, 0o700);
};

export const getAuthDir = (provider: string): string => {
    return path.join(getConfigDir(), 'auth', provider);
};

export const getAuthFilePath = (provider: string, profile: string): string => {
    return path.join(getAuthDir(provider), `${profile}.json`);
};

export const ensureAuthDir = (provider: string): void => {
    const dir = getAuthDir(provider);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
    ensureFileMode(dir, 0o700);
};
