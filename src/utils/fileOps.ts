import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const ensureFileMode = (filePath: string, mode: number): void => {
    if (!fs.existsSync(filePath)) {
        return;
    }

    const currentMode = fs.statSync(filePath).mode & 0o777;
    if (currentMode !== mode) {
        fs.chmodSync(filePath, mode);
    }
};

export const atomicWriteFile = (
    filePath: string,
    content: string,
    mode?: number,
): void => {
    const directory = path.dirname(filePath);
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    }

    const tempName = `.${path.basename(filePath)}.${process.pid}.${crypto.randomUUID()}.tmp`;
    const tempPath = path.join(directory, tempName);

    try {
        if (mode === undefined) {
            fs.writeFileSync(tempPath, content, 'utf-8');
        } else {
            fs.writeFileSync(tempPath, content, { encoding: 'utf-8', mode });
        }
        fs.renameSync(tempPath, filePath);
        if (mode !== undefined) {
            fs.chmodSync(filePath, mode);
        }
    } finally {
        if (fs.existsSync(tempPath)) {
            fs.rmSync(tempPath, { force: true });
        }
    }
};

export const quarantineCorruptFile = (
    filePath: string,
    suffix: string,
): string => {
    if (!fs.existsSync(filePath)) {
        return filePath;
    }

    const quarantinePath = `${filePath}.corrupt-${suffix}`;
    try {
        fs.renameSync(filePath, quarantinePath);
        return quarantinePath;
    } catch {
        return filePath;
    }
};
