import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const run = (command, args) => {
    const result = spawnSync(command, args, {
        stdio: 'inherit',
        cwd: process.cwd(),
        env: process.env,
    });

    if (result.status !== 0) {
        process.exit(result.status ?? 1);
    }
};

const parseFlags = (args) => {
    const flags = {};
    for (let i = 0; i < args.length; i += 1) {
        const arg = args[i];
        if (!arg.startsWith('--')) continue;

        const [name, inlineValue] = arg.split('=');
        if (inlineValue !== undefined) {
            flags[name.slice(2)] = inlineValue;
            continue;
        }

        const next = args[i + 1];
        if (next && !next.startsWith('--')) {
            flags[name.slice(2)] = next;
            i += 1;
        } else {
            flags[name.slice(2)] = 'true';
        }
    }
    return flags;
};

const bumpPatch = (version) => {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
    if (!match) {
        throw new Error(
            `Unsupported version format "${version}". Pass --version x.y.z explicitly.`,
        );
    }
    const major = Number(match[1]);
    const minor = Number(match[2]);
    const patch = Number(match[3]) + 1;
    return `${major}.${minor}.${patch}`;
};

const semverPattern = /^\d+\.\d+\.\d+$/;
const flags = parseFlags(process.argv.slice(2));
const noPush = flags['no-push'] === 'true';
const resume = flags.resume === 'true';
const target = flags.target === 'github' ? 'github' : 'npm';

const packageJsonPath = path.join(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const currentVersion = packageJson.version;

const requestedVersion = flags.version;
const nextVersion = resume ? currentVersion : requestedVersion ?? bumpPatch(currentVersion);

if (!semverPattern.test(nextVersion)) {
    throw new Error(`Invalid version "${nextVersion}". Expected x.y.z`);
}

if (!resume && nextVersion === currentVersion) {
    throw new Error(
        `Version ${nextVersion} is already current. Pass a higher --version value.`,
    );
}

const today = new Date().toISOString().slice(0, 10);

if (resume) {
    console.log(`Resuming release ${nextVersion}...`);
} else {
    console.log(`Releasing ${nextVersion} (from ${currentVersion})...`);
    run('npm', ['version', nextVersion, '--no-git-tag-version']);
    run('pnpm', ['changelog:release', '--', '--version', nextVersion, '--date', today]);
}
if (target === 'github') {
    run('pnpm', ['release:publish']);
} else {
    run('pnpm', ['release:publish:npm']);
}

run('git', ['add', '-A']);
run('git', ['commit', '-m', `chore(release): ${nextVersion}`]);
run('git', ['tag', `v${nextVersion}`]);

if (!noPush) {
    run('git', ['push']);
    run('git', ['push', 'origin', `v${nextVersion}`]);
}

if (noPush) {
    console.log(
        `Release ${nextVersion} complete. Push with: git push && git push origin v${nextVersion}`,
    );
} else {
    console.log(`Release ${nextVersion} complete and pushed (${target} publish).`);
}
