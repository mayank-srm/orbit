import { Command } from 'commander';
import ora from 'ora';
import { getProvider } from '../providers/provider.interface.js';
import { deleteToken } from '../storage/keychain.js';
import { removeProfile, profileExists } from '../storage/configStore.js';
import { validateProviderName, validateProfileName } from '../utils/validator.js';
import { logger } from '../utils/logger.js';
import { handleError } from '../utils/errorHandler.js';

export const removeCommand = new Command('remove')
    .description('Remove a cloud provider profile')
    .argument('<provider>', 'Cloud provider name')
    .argument('<profile>', 'Profile name to remove')
    .action(async (providerName: string, profileName: string) => {
        try {
            const validProvider = validateProviderName(providerName);
            const validProfile = validateProfileName(profileName);
            getProvider(validProvider); // Ensure provider is registered

            if (!profileExists(validProvider, validProfile)) {
                logger.error(`Profile "${validProfile}" does not exist for provider "${validProvider}".`);
                process.exit(1);
            }

            const spinner = ora('Removing profile...').start();

            spinner.text = 'Deleting token from secure storage...';
            await deleteToken(validProvider, validProfile);

            spinner.text = 'Updating configuration...';
            removeProfile(validProvider, validProfile);

            spinner.succeed(`Profile "${validProfile}" removed from ${validProvider}.`);
        } catch (error: unknown) {
            handleError(error);
        }
    });
