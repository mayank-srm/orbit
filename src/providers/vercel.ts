import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { Provider } from './provider.interface.js';
import { getAuthFilePath, ensureAuthDir } from '../utils/paths.js';
import { ensureFileMode } from '../utils/fileOps.js';

const getVercelAuthPath = (): string | null => {
    const platform = os.platform();
    const home = os.homedir();
    const xdgDataHome = process.env['XDG_DATA_HOME'];

    // Allow explicit XDG override on any platform for sandboxed/testing environments.
    if (xdgDataHome && xdgDataHome.trim().length > 0) {
        return path.join(xdgDataHome, 'com.vercel.cli', 'auth.json');
    }

    if (platform === 'darwin') {
        return path.join(
            home,
            'Library',
            'Application Support',
            'com.vercel.cli',
            'auth.json',
        );
    } else if (platform === 'win32') {
        const appData = process.env['APPDATA'] || path.join(home, 'AppData', 'Roaming');
        return path.join(appData, 'com.vercel.cli', 'auth.json');
    } else {
        const linuxDataHome = path.join(home, '.local', 'share');
        return path.join(linuxDataHome, 'com.vercel.cli', 'auth.json');
    }
};

const ensureVercelAuthDir = (authPath: string): void => {
    const authDir = path.dirname(authPath);
    if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true, mode: 0o700 });
    }
};

const writeVercelAuthToken = (token: string): boolean => {
    const authPath = getVercelAuthPath();
    if (!authPath) return false;

    ensureVercelAuthDir(authPath);
    fs.writeFileSync(authPath, JSON.stringify({ token }, null, 2), {
        encoding: 'utf-8',
        mode: 0o600,
    });
    ensureFileMode(authPath, 0o600);
    return true;
};

export const vercelProvider: Provider = {
    name: 'vercel',

    getEnvVar(): string {
        return 'VERCEL_TOKEN';
    },

    getCliName(): string {
        return 'vercel';
    },

    validateToken(token: string): boolean {
        return token.length > 20;
    },

    async getStoredToken(): Promise<string | null> {
        try {
            const configPath = getVercelAuthPath();
            if (configPath && fs.existsSync(configPath)) {
                const content = fs.readFileSync(configPath, 'utf-8');
                const config = JSON.parse(content) as { token?: string };
                if (config.token && typeof config.token === 'string') {
                    return config.token;
                }
            }
        } catch {
            // Ignore errors
        }
        return null;
    },

    async getUserEmail(token: string): Promise<string | undefined> {
        try {
            const response = await fetch('https://api.vercel.com/v2/user', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) return undefined;

            const data = (await response.json()) as { user: { email: string } };
            return data.user.email;
        } catch {
            return undefined;
        }
    },

    async login(): Promise<boolean> {
        try {
            const { execa } = await import('execa');
            await execa('vercel', ['login'], { stdio: 'inherit' });
            return true;
        } catch {
            return false;
        }
    },

    getAuthConfigPath(): string | null {
        return getVercelAuthPath();
    },

    async captureAuth(profile: string): Promise<void> {
        const authPath = getVercelAuthPath();
        if (!authPath || !fs.existsSync(authPath)) return;

        ensureAuthDir('vercel');
        const destPath = getAuthFilePath('vercel', profile);
        fs.copyFileSync(authPath, destPath);
        ensureFileMode(destPath, 0o600);
    },

    async restoreAuth(profile: string): Promise<boolean> {
        const sourcePath = getAuthFilePath('vercel', profile);
        if (!fs.existsSync(sourcePath)) return false;

        const authPath = getVercelAuthPath();
        if (!authPath) return false;

        // Ensure the Vercel config directory exists
        ensureVercelAuthDir(authPath);

        fs.copyFileSync(sourcePath, authPath);
        ensureFileMode(authPath, 0o600);
        return true;
    },

    async seedAuthFromToken(token: string): Promise<boolean> {
        return writeVercelAuthToken(token);
    },

    async validateActiveAuth(): Promise<boolean> {
        const token = await this.getStoredToken?.();
        if (!token) return false;

        try {
            const { execa } = await import('execa');
            const result = await execa('vercel', ['whoami', '--token', token], {
                stdio: 'pipe',
                reject: false,
            });

            if (result.exitCode === 0) {
                return true;
            }

            const output = `${result.stdout}\n${result.stderr}`.toLowerCase();
            if (output.includes('token is not valid') || output.includes('not valid')) {
                return false;
            }

            // Inconclusive failures (e.g., transient network issues) should not block switching.
            return true;
        } catch {
            return true;
        }
    },

    async removeAuthSnapshot(profile: string): Promise<void> {
        const snapshotPath = getAuthFilePath('vercel', profile);
        if (fs.existsSync(snapshotPath)) {
            fs.rmSync(snapshotPath, { force: true });
        }
    },
};
