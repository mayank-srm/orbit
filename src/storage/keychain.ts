import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getConfigDir, ensureConfigDir } from '../utils/paths.js';
import { atomicWriteFile, ensureFileMode, quarantineCorruptFile } from '../utils/fileOps.js';
import { logger } from '../utils/logger.js';

const CREDENTIALS_FILE = 'credentials.json';
const KEY_FILE = '.key';
const ALGORITHM = 'aes-256-gcm';
const ENCRYPTED_FILE_MODE = 0o600;

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

const writeKey = (keyPath: string, key: Buffer): void => {
    atomicWriteFile(keyPath, key.toString('hex'), ENCRYPTED_FILE_MODE);
};

const readKey = (keyPath: string): Buffer => {
    ensureFileMode(keyPath, ENCRYPTED_FILE_MODE);
    const raw = fs.readFileSync(keyPath, 'utf-8').trim();
    if (!/^[0-9a-fA-F]{64}$/.test(raw)) {
        throw new Error('Invalid encryption key format.');
    }
    return Buffer.from(raw, 'hex');
};

const getOrCreateKey = (): Buffer => {
    const keyPath = getKeyPath();
    ensureConfigDir();

    if (fs.existsSync(keyPath)) {
        return readKey(keyPath);
    }

    // Generate a random 256-bit key
    const key = crypto.randomBytes(32);
    writeKey(keyPath, key);
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

    ensureFileMode(filePath, ENCRYPTED_FILE_MODE);

    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as CredentialStore;
    } catch {
        const quarantinePath = quarantineCorruptFile(filePath, `${Date.now()}`);
        logger.warn(
            `Detected invalid credentials store. Backed it up to "${quarantinePath}" and re-initialized credentials.`,
        );
        return {};
    }
};

const saveStore = (store: CredentialStore): void => {
    ensureConfigDir();
    const filePath = getCredentialsPath();
    atomicWriteFile(filePath, JSON.stringify(store, null, 2), ENCRYPTED_FILE_MODE);
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

export const rotateEncryptionKey = async (): Promise<void> => {
    const keyPath = getKeyPath();
    const oldKey = getOrCreateKey();
    const store = loadStore();
    const decryptedEntries = new Map<string, string>();

    for (const [entryKey, entryValue] of Object.entries(store)) {
        decryptedEntries.set(entryKey, decrypt(entryValue, oldKey));
    }

    const newKey = crypto.randomBytes(32);
    const rotatedStore: CredentialStore = {};
    for (const [entryKey, token] of decryptedEntries.entries()) {
        rotatedStore[entryKey] = encrypt(token, newKey);
    }

    const backupPath = `${keyPath}.bak-${Date.now()}`;
    if (fs.existsSync(keyPath)) {
        fs.copyFileSync(keyPath, backupPath);
    }

    try {
        writeKey(keyPath, newKey);
        saveStore(rotatedStore);
    } catch (error: unknown) {
        if (fs.existsSync(backupPath)) {
            fs.copyFileSync(backupPath, keyPath);
            ensureFileMode(keyPath, ENCRYPTED_FILE_MODE);
        }
        throw error;
    } finally {
        if (fs.existsSync(backupPath)) {
            fs.rmSync(backupPath, { force: true });
        }
    }
};
