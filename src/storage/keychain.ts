import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { getConfigDir, ensureConfigDir } from '../utils/paths.js';

const CREDENTIALS_FILE = 'credentials.json';
const KEY_FILE = '.key';
const ALGORITHM = 'aes-256-gcm';

interface EncryptedEntry {
    iv: string;
    tag: string;
    data: string;
}

interface CredentialStore {
    [key: string]: EncryptedEntry;
}

const getCredentialsPath = (): string => {
    return path.join(getConfigDir(), CREDENTIALS_FILE);
};

const getKeyPath = (): string => {
    return path.join(getConfigDir(), KEY_FILE);
};

const getOrCreateKey = (): Buffer => {
    const keyPath = getKeyPath();
    ensureConfigDir();

    if (fs.existsSync(keyPath)) {
        return Buffer.from(fs.readFileSync(keyPath, 'utf-8'), 'hex');
    }

    // Generate a random 256-bit key
    const key = crypto.randomBytes(32);
    fs.writeFileSync(keyPath, key.toString('hex'), { mode: 0o600 });
    return key;
};

const encrypt = (text: string, key: Buffer): EncryptedEntry => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf-8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();
    return {
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        data: encrypted,
    };
};

const decrypt = (entry: EncryptedEntry, key: Buffer): string => {
    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        key,
        Buffer.from(entry.iv, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(entry.tag, 'hex'));
    let decrypted = decipher.update(entry.data, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');
    return decrypted;
};

const loadStore = (): CredentialStore => {
    const filePath = getCredentialsPath();
    if (!fs.existsSync(filePath)) return {};
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as CredentialStore;
    } catch {
        return {};
    }
};

const saveStore = (store: CredentialStore): void => {
    ensureConfigDir();
    const filePath = getCredentialsPath();
    fs.writeFileSync(filePath, JSON.stringify(store, null, 2), { mode: 0o600 });
};

const getKey = (provider: string, profile: string): string => {
    return `${provider}:${profile}`;
};

export const storeToken = async (
    provider: string,
    profile: string,
    token: string,
): Promise<void> => {
    const key = getOrCreateKey();
    const store = loadStore();
    store[getKey(provider, profile)] = encrypt(token, key);
    saveStore(store);
};

export const getToken = async (
    provider: string,
    profile: string,
): Promise<string | null> => {
    try {
        const key = getOrCreateKey();
        const store = loadStore();
        const entry = store[getKey(provider, profile)];
        if (!entry) return null;
        return decrypt(entry, key);
    } catch {
        return null;
    }
};

export const deleteToken = async (
    provider: string,
    profile: string,
): Promise<boolean> => {
    const store = loadStore();
    const k = getKey(provider, profile);
    if (!(k in store)) return false;
    delete store[k];
    saveStore(store);
    return true;
};
