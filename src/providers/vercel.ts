import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { Provider } from './provider.interface.js';
import { getAuthFilePath, ensureAuthDir } from '../utils/paths.js';

const getVercelAuthPath = (): string | null => {
    const platform = os.platform();
    const home = os.homedir();

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
        const xdgDataHome =
            process.env['XDG_DATA_HOME'] || path.join(home, '.local', 'share');
        return path.join(xdgDataHome, 'com.vercel.cli', 'auth.json');
    }
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
    },

    async restoreAuth(profile: string): Promise<boolean> {
        const sourcePath = getAuthFilePath('vercel', profile);
        if (!fs.existsSync(sourcePath)) return false;

        const authPath = getVercelAuthPath();
        if (!authPath) return false;

        // Ensure the Vercel config directory exists
        const authDir = path.dirname(authPath);
        if (!fs.existsSync(authDir)) {
            fs.mkdirSync(authDir, { recursive: true });
        }

        fs.copyFileSync(sourcePath, authPath);
        return true;
    },
};
