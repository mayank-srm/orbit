import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const packagePath = path.join(cwd, 'package.json');
const changelogPath = path.join(cwd, 'CHANGELOG.md');

const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
const changelog = fs.readFileSync(changelogPath, 'utf-8');
const version = packageJson.version;

const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const versionHeaderPattern = new RegExp(
    `^## \\[${escapedVersion}\\] - \\d{4}-\\d{2}-\\d{2}$`,
    'm',
);

if (!versionHeaderPattern.test(changelog)) {
    console.error(
        `Missing changelog entry for package version ${version}. Add a heading like "## [${version}] - YYYY-MM-DD".`,
    );
    process.exit(1);
}

if (!/^## \[Unreleased\]$/m.test(changelog)) {
    console.error('Missing "## [Unreleased]" section in CHANGELOG.md.');
    process.exit(1);
}

console.log(`Release metadata check passed for version ${version}.`);
