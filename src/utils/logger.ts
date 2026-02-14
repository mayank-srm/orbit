import chalk from 'chalk';

let jsonMode = false;

const write = (stream: NodeJS.WriteStream, message: string): void => {
    stream.write(`${message}\n`);
};

const writeJson = (
    stream: NodeJS.WriteStream,
    level: 'info' | 'success' | 'warn' | 'error',
    message: string,
): void => {
    write(
        stream,
        JSON.stringify({
            level,
            message,
        }),
    );
};

export const setJsonMode = (enabled: boolean): void => {
    jsonMode = enabled;
};

export const logger = {
    isJsonMode: (): boolean => {
        return jsonMode;
    },

    json: (payload: unknown): void => {
        write(process.stdout, JSON.stringify(payload));
    },

    info: (message: string): void => {
        if (jsonMode) {
            writeJson(process.stdout, 'info', message);
            return;
        }
        write(process.stdout, chalk.blue('ℹ') + ` ${message}`);
    },

    success: (message: string): void => {
        if (jsonMode) {
            writeJson(process.stdout, 'success', message);
            return;
        }
        write(process.stdout, chalk.green('✔') + ` ${message}`);
    },

    warn: (message: string): void => {
        if (jsonMode) {
            writeJson(process.stderr, 'warn', message);
            return;
        }
        write(process.stderr, chalk.yellow('⚠') + ` ${message}`);
    },

    error: (message: string): void => {
        if (jsonMode) {
            writeJson(process.stderr, 'error', message);
            return;
        }
        write(process.stderr, chalk.red('✖') + ` ${message}`);
    },

    plain: (message: string): void => {
        if (jsonMode) {
            write(process.stdout, message);
            return;
        }
        write(process.stdout, message);
    },

    newline: (): void => {
        if (jsonMode) {
            return;
        }
        write(process.stdout, '');
    },
};
