import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const npmCacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-npm-cache-'));

const run = (command, args, options = {}) => {
    const result = spawnSync(command, args, {
        cwd: process.cwd(),
        encoding: 'utf-8',
        ...options,
        env: {
            ...process.env,
            NPM_CONFIG_CACHE: npmCacheDir,
            ...(options.env ?? {}),
        },
    });

    if (result.status !== 0) {
        const stderr = result.stderr?.trim() ?? '';
        const stdout = result.stdout?.trim() ?? '';
        throw new Error(
            `${command} ${args.join(' ')} failed.\nstdout:\n${stdout}\nstderr:\n${stderr}`,
        );
    }

    return result.stdout;
};

const requiredPackageEntries = [
    'package/dist/index.js',
    'package/dist/index.d.ts',
    'package/package.json',
    'package/README.md',
];

let tarballPath = '';
try {
    const packOutput = run('npm', ['pack', '--json']);
    const parsed = JSON.parse(packOutput);
    if (!Array.isArray(parsed) || parsed.length === 0 || !parsed[0]?.filename) {
        throw new Error('Failed to parse npm pack output.');
    }

    tarballPath = path.resolve(parsed[0].filename);
    const tarListOutput = run('tar', ['-tzf', tarballPath]);
    const entries = tarListOutput
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    for (const requiredEntry of requiredPackageEntries) {
        if (!entries.includes(requiredEntry)) {
            throw new Error(`Packaged tarball is missing required entry: ${requiredEntry}`);
        }
    }

    const versionOutput = run(process.execPath, ['dist/index.js', '--version']).trim();
    if (!versionOutput) {
        throw new Error('Built CLI did not return a version.');
    }

    console.log(`Package smoke test passed (orbit ${versionOutput}).`);
} finally {
    if (tarballPath && fs.existsSync(tarballPath)) {
        fs.rmSync(tarballPath, { force: true });
    }
    if (fs.existsSync(npmCacheDir)) {
        fs.rmSync(npmCacheDir, { recursive: true, force: true });
    }
}
