import { logger } from './logger.js';
import { ZodError } from 'zod';

export const handleError = (error: unknown): never => {
    if (error instanceof ZodError) {
        const messages = error.errors.map((e) => e.message).join(', ');
        logger.error(`Validation error: ${messages}`);
        process.exit(1);
    }

    if (error instanceof Error) {
        logger.error(error.message);

        if (process.env['ORBIT_DEBUG'] === '1') {
            logger.plain(error.stack ?? '');
        }

        process.exit(1);
    }

    logger.error('An unexpected error occurred.');
    process.exit(1);
};
