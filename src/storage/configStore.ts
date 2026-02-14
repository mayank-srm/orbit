import fs from 'node:fs';
import { OrbitConfigSchema } from '../types/config.js';
import type { OrbitConfig } from '../types/config.js';
import { getConfigPath, ensureConfigDir } from '../utils/paths.js';
import { atomicWriteFile, ensureFileMode, quarantineCorruptFile } from '../utils/fileOps.js';
import { logger } from '../utils/logger.js';

const defaultConfig: OrbitConfig = {
    providers: {},
};

const writeDefaultConfig = (configPath: string): OrbitConfig => {
    ensureConfigDir();
    atomicWriteFile(
        configPath,
        JSON.stringify(defaultConfig, null, 2),
        0o600,
    );
    return { providers: {} };
};

export const loadConfig = (): OrbitConfig => {
    const configPath = getConfigPath();

    if (!fs.existsSync(configPath)) {
        return writeDefaultConfig(configPath);
    }

    ensureFileMode(configPath, 0o600);

    try {
        const raw = fs.readFileSync(configPath, 'utf-8');
        const parsed: unknown = JSON.parse(raw);
        return OrbitConfigSchema.parse(parsed);
    } catch (error: unknown) {
        const quarantinePath = quarantineCorruptFile(configPath, `${Date.now()}`);
        logger.warn(
            `Detected invalid config. Backed it up to "${quarantinePath}" and re-initialized Orbit config.`,
        );
        return writeDefaultConfig(configPath);
    }
};

export const saveConfig = (config: OrbitConfig): void => {
    ensureConfigDir();
    const configPath = getConfigPath();
    atomicWriteFile(configPath, JSON.stringify(config, null, 2), 0o600);
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

    if (providerConfig.metadata?.[profile]) {
        delete providerConfig.metadata[profile];
        if (Object.keys(providerConfig.metadata).length === 0) {
            delete providerConfig.metadata;
        }
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
