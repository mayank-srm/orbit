import { logger } from './logger.js';
import { ZodError } from 'zod';
import { CliError } from './cliError.js';
import { redactSecrets } from './redact.js';

const printDebugStack = (error: Error): void => {
    if (process.env['ORBIT_DEBUG'] !== '1') {
        return;
    }

    logger.plain(redactSecrets(error.stack ?? ''));
};

export const handleError = (error: unknown): void => {
    if (error instanceof ZodError) {
        const messages = error.issues.map((e: { message: string }) => e.message).join(', ');
        const message = `Validation error: ${messages}`;
        if (logger.isJsonMode()) {
            logger.json({
                ok: false,
                error: {
                    type: 'validation_error',
                    message,
                },
            });
        } else {
            logger.error(message);
        }
        process.exitCode = 1;
        return;
    }

    if (error instanceof CliError) {
        if (logger.isJsonMode()) {
            logger.json({
                ok: false,
                error: {
                    type: 'cli_error',
                    message: error.message,
                },
            });
        } else {
            logger.error(error.message);
        }
        process.exitCode = error.exitCode;
        printDebugStack(error);
        return;
    }

    if (error instanceof Error) {
        const message = redactSecrets(error.message);
        if (logger.isJsonMode()) {
            logger.json({
                ok: false,
                error: {
                    type: 'runtime_error',
                    message,
                },
            });
        } else {
            logger.error(message);
        }
        process.exitCode = 1;
        printDebugStack(error);
        return;
    }

    if (logger.isJsonMode()) {
        logger.json({
            ok: false,
            error: {
                type: 'unknown_error',
                message: 'An unexpected error occurred.',
            },
        });
    } else {
        logger.error('An unexpected error occurred.');
    }
    process.exitCode = 1;
};
