const PATTERNS: Array<[RegExp, string]> = [
    [/(Bearer\s+)[A-Za-z0-9._\-~=+/]+/g, '$1[REDACTED]'],
    [/([A-Z_]*TOKEN=)[^\s"']+/g, '$1[REDACTED]'],
    [/"token"\s*:\s*"[^"]+"/g, '"token":"[REDACTED]"'],
];

export const redactSecrets = (value: string): string => {
    let output = value;
    for (const [pattern, replacement] of PATTERNS) {
        output = output.replace(pattern, replacement);
    }
    return output;
};
