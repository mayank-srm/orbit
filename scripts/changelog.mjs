import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_SECTION_ORDER = ['Added', 'Changed', 'Fixed', 'Removed', 'Security'];
const BASE_UNRELEASED_SECTIONS = ['Added', 'Changed', 'Fixed'];

const usage = () => {
    console.error(`Usage:
  node scripts/changelog.mjs add --type <added|changed|fixed|removed|security> --message "<text>" [--dry-run]
  node scripts/changelog.mjs release [--version <x.y.z>] [--date <YYYY-MM-DD>] [--dry-run]
`);
    process.exit(1);
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

const normalizeSectionType = (type) => {
    const mapping = {
        added: 'Added',
        changed: 'Changed',
        fixed: 'Fixed',
        removed: 'Removed',
        security: 'Security',
    };
    return mapping[type.toLowerCase()] ?? null;
};

const getChangelogPath = () => {
    return path.join(process.cwd(), 'CHANGELOG.md');
};

const getPackageVersion = () => {
    const packagePath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    if (typeof packageJson.version !== 'string' || packageJson.version.length === 0) {
        throw new Error('Unable to read package version from package.json');
    }
    return packageJson.version;
};

const escapeRegExp = (value) => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const trimBlankEdges = (lines) => {
    let start = 0;
    let end = lines.length;
    while (start < end && lines[start]?.trim() === '') {
        start += 1;
    }
    while (end > start && lines[end - 1]?.trim() === '') {
        end -= 1;
    }
    return lines.slice(start, end);
};

const parseSections = (bodyLines) => {
    const sections = new Map();
    const order = [];
    let currentSection = null;

    for (const line of bodyLines) {
        const headingMatch = line.match(/^###\s+(.+)$/);
        if (headingMatch) {
            currentSection = headingMatch[1].trim();
            if (!sections.has(currentSection)) {
                sections.set(currentSection, []);
                order.push(currentSection);
            }
            continue;
        }

        if (!currentSection) continue;
        if (line.trim() === '') continue;
        sections.get(currentSection)?.push(line);
    }

    return { sections, order };
};

const buildSectionLines = ({
    sections,
    knownOrder,
    includeEmptySections,
    requiredSections,
}) => {
    const lines = [];
    const allKnown = [...knownOrder];
    for (const sectionName of sections.keys()) {
        if (!allKnown.includes(sectionName)) {
            allKnown.push(sectionName);
        }
    }
    for (const sectionName of requiredSections) {
        if (!allKnown.includes(sectionName)) {
            allKnown.push(sectionName);
        }
        if (!sections.has(sectionName)) {
            sections.set(sectionName, []);
        }
    }

    const orderedSections = allKnown.filter((sectionName) => sections.has(sectionName));
    let first = true;
    for (const sectionName of orderedSections) {
        const entries = sections.get(sectionName) ?? [];
        if (!includeEmptySections && entries.length === 0) {
            continue;
        }
        if (!first) {
            lines.push('');
        }
        first = false;
        lines.push(`### ${sectionName}`);
        lines.push('');
        lines.push(...entries);
    }

    return lines;
};

const splitChangelog = (fullText) => {
    const lines = fullText.split(/\r?\n/);
    const unreleasedHeadingIndex = lines.findIndex((line) => line.trim() === '## [Unreleased]');
    if (unreleasedHeadingIndex === -1) {
        throw new Error('Missing "## [Unreleased]" section in CHANGELOG.md');
    }

    const nextReleaseIndex =
        lines.findIndex(
            (line, index) => index > unreleasedHeadingIndex && /^## \[.+\]/.test(line.trim()),
        ) === -1
            ? lines.length
            : lines.findIndex(
                  (line, index) => index > unreleasedHeadingIndex && /^## \[.+\]/.test(line.trim()),
              );

    const before = lines.slice(0, unreleasedHeadingIndex);
    const unreleasedBody = lines.slice(unreleasedHeadingIndex + 1, nextReleaseIndex);
    const after = lines.slice(nextReleaseIndex);

    return {
        before: trimBlankEdges(before),
        unreleasedBody: trimBlankEdges(unreleasedBody),
        after: trimBlankEdges(after),
    };
};

const writeChangelog = (content, dryRun) => {
    if (dryRun) {
        process.stdout.write(content);
        return;
    }
    fs.writeFileSync(getChangelogPath(), content, 'utf-8');
};

const rebuildChangelog = ({ before, unreleasedSectionLines, releaseBlockLines, after }) => {
    const lines = [];
    lines.push(...before);
    lines.push('');
    lines.push('## [Unreleased]');
    lines.push('');
    lines.push(...unreleasedSectionLines);

    if (releaseBlockLines.length > 0) {
        lines.push('');
        lines.push(...releaseBlockLines);
    }

    if (after.length > 0) {
        lines.push('');
        lines.push(...after);
    }

    while (lines.length > 0 && lines[lines.length - 1]?.trim() === '') {
        lines.pop();
    }
    lines.push('');
    return lines.join('\n');
};

const command = process.argv[2];
const flags = parseFlags(process.argv.slice(3));
const dryRun = flags['dry-run'] === 'true';

if (!command) usage();

const changelogPath = getChangelogPath();
if (!fs.existsSync(changelogPath)) {
    throw new Error(`CHANGELOG.md not found at ${changelogPath}`);
}

const fullChangelogText = fs.readFileSync(changelogPath, 'utf-8');
const { before, unreleasedBody, after } = splitChangelog(fullChangelogText);
const parsed = parseSections(unreleasedBody);

if (command === 'add') {
    const sectionTypeRaw = flags.type;
    const message = flags.message;
    if (!sectionTypeRaw || !message) {
        usage();
    }

    const sectionType = normalizeSectionType(sectionTypeRaw);
    if (!sectionType) {
        throw new Error(
            `Invalid --type "${sectionTypeRaw}". Use one of: added, changed, fixed, removed, security.`,
        );
    }

    if (!parsed.sections.has(sectionType)) {
        parsed.sections.set(sectionType, []);
    }

    const formattedMessage = message.startsWith('- ') ? message : `- ${message}`;
    parsed.sections.get(sectionType)?.push(formattedMessage);

    const unreleasedSectionLines = buildSectionLines({
        sections: parsed.sections,
        knownOrder: DEFAULT_SECTION_ORDER,
        includeEmptySections: true,
        requiredSections: BASE_UNRELEASED_SECTIONS,
    });

    const newContent = rebuildChangelog({
        before,
        unreleasedSectionLines,
        releaseBlockLines: [],
        after,
    });

    writeChangelog(newContent, dryRun);
    if (!dryRun) {
        console.log(`Added changelog entry under "${sectionType}": ${message}`);
    }
    process.exit(0);
}

if (command === 'release') {
    const version = flags.version ?? getPackageVersion();
    const date = flags.date ?? new Date().toISOString().slice(0, 10);

    if (!/^\d+\.\d+\.\d+(-[A-Za-z0-9.-]+)?$/.test(version)) {
        throw new Error(`Invalid version "${version}". Expected semver format (e.g., 1.2.3).`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error(`Invalid date "${date}". Expected YYYY-MM-DD.`);
    }

    const existingVersionPattern = new RegExp(`^## \\[${escapeRegExp(version)}\\]`, 'm');
    if (existingVersionPattern.test(fullChangelogText)) {
        throw new Error(`Version ${version} already exists in CHANGELOG.md`);
    }

    let hasEntries = false;
    for (const entries of parsed.sections.values()) {
        if (entries.length > 0) {
            hasEntries = true;
            break;
        }
    }
    if (!hasEntries) {
        throw new Error('Unreleased section has no entries. Add at least one changelog item before releasing.');
    }

    const releaseSections = new Map();
    for (const [sectionName, entries] of parsed.sections.entries()) {
        if (entries.length > 0) {
            releaseSections.set(sectionName, entries);
        }
    }

    const releaseSectionLines = buildSectionLines({
        sections: releaseSections,
        knownOrder: DEFAULT_SECTION_ORDER,
        includeEmptySections: false,
        requiredSections: [],
    });

    const freshUnreleasedSections = new Map();
    for (const sectionName of BASE_UNRELEASED_SECTIONS) {
        freshUnreleasedSections.set(sectionName, []);
    }

    const unreleasedSectionLines = buildSectionLines({
        sections: freshUnreleasedSections,
        knownOrder: DEFAULT_SECTION_ORDER,
        includeEmptySections: true,
        requiredSections: BASE_UNRELEASED_SECTIONS,
    });

    const releaseBlockLines = [`## [${version}] - ${date}`, '', ...releaseSectionLines];

    const newContent = rebuildChangelog({
        before,
        unreleasedSectionLines,
        releaseBlockLines,
        after,
    });

    writeChangelog(newContent, dryRun);
    if (!dryRun) {
        console.log(`Released changelog for version ${version} (${date}).`);
    }
    process.exit(0);
}

usage();
