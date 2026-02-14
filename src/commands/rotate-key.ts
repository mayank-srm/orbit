import { Command } from 'commander';
import { rotateEncryptionKey } from '../storage/keychain.js';
import { handleError } from '../utils/errorHandler.js';
import { createSpinner } from '../utils/spinner.js';

export const rotateKeyCommand = new Command('rotate-key')
    .description('Rotate local encryption key and re-encrypt stored tokens')
    .action(async () => {
        const spinner = createSpinner('Rotating encryption key...');
        try {
            await rotateEncryptionKey();
            spinner.succeed('Encryption key rotated successfully.');
        } catch (error: unknown) {
            spinner.fail('Failed to rotate encryption key.');
            handleError(error);
        }
    });
