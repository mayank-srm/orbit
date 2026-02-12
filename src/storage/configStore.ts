import fs from 'node:fs';
import { OrbitConfigSchema } from '../types/config.js';
import type { OrbitConfig } from '../types/config.js';
import { getConfigPath, ensureConfigDir } from '../utils/paths.js';

const defaultConfig: OrbitConfig = {
    providers: {},
};

export const loadConfig = (): OrbitConfig => {
    const configPath = getConfigPath();

    if (!fs.existsSync(configPath)) {
        ensureConfigDir();
        fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
        return { ...defaultConfig };
    }

    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    return OrbitConfigSchema.parse(parsed);
};

export const saveConfig = (config: OrbitConfig): void => {
    ensureConfigDir();
    const configPath = getConfigPath();
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
};

export const addProfile = (
    provider: string,
    profile: string,
    metadata?: { email?: string },
): void => {
    const config = loadConfig();

    if (!config.providers[provider]) {
        config.providers[provider] = { profiles: [], current: undefined };
    }

    const providerConfig = config.providers[provider];
    if (providerConfig && !providerConfig.profiles.includes(profile)) {
        providerConfig.profiles.push(profile);
    }

    if (metadata) {
        if (!providerConfig.metadata) {
            providerConfig.metadata = {};
        }
        providerConfig.metadata[profile] = metadata;
    }

    saveConfig(config);
};

export const removeProfile = (provider: string, profile: string): void => {
    const config = loadConfig();
    const providerConfig = config.providers[provider];

    if (!providerConfig) return;

    providerConfig.profiles = providerConfig.profiles.filter((p) => p !== profile);

    if (providerConfig.current === profile) {
        providerConfig.current = undefined;
    }

    if (providerConfig.profiles.length === 0) {
        delete config.providers[provider];
    }

    saveConfig(config);
};

export const setCurrentProfile = (provider: string, profile: string): void => {
    const config = loadConfig();
    const providerConfig = config.providers[provider];

    if (!providerConfig) {
        throw new Error(`No profiles found for provider "${provider}".`);
    }

    if (!providerConfig.profiles.includes(profile)) {
        throw new Error(`Profile "${profile}" does not exist for provider "${provider}".`);
    }

    providerConfig.current = profile;
    saveConfig(config);
};

export const getCurrentProfile = (provider: string): string | undefined => {
    const config = loadConfig();
    return config.providers[provider]?.current;
};

export const profileExists = (provider: string, profile: string): boolean => {
    const config = loadConfig();
    return config.providers[provider]?.profiles.includes(profile) ?? false;
};
