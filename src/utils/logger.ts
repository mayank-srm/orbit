import chalk from 'chalk';

const write = (stream: NodeJS.WriteStream, message: string): void => {
    stream.write(`${message}\n`);
};

export const logger = {
    info: (message: string): void => {
        write(process.stdout, chalk.blue('ℹ') + ` ${message}`);
    },

    success: (message: string): void => {
        write(process.stdout, chalk.green('✔') + ` ${message}`);
    },

    warn: (message: string): void => {
        write(process.stderr, chalk.yellow('⚠') + ` ${message}`);
    },

    error: (message: string): void => {
        write(process.stderr, chalk.red('✖') + ` ${message}`);
    },

    plain: (message: string): void => {
        write(process.stdout, message);
    },

    newline: (): void => {
        write(process.stdout, '');
    },
};
