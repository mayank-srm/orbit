import { Command } from 'commander';
import { getProvider } from '../providers/provider.interface.js';
import { deleteToken } from '../storage/keychain.js';
import { removeProfile, profileExists } from '../storage/configStore.js';
import { validateProviderName, validateProfileName } from '../utils/validator.js';
import { handleError } from '../utils/errorHandler.js';
import { fail } from '../utils/cliError.js';
import { createSpinner } from '../utils/spinner.js';

export const removeCommand = new Command('remove')
    .description('Remove a cloud provider profile')
    .argument('<provider>', 'Cloud provider name')
    .argument('<profile>', 'Profile name to remove')
    .action(async (providerName: string, profileName: string) => {
        try {
            const validProvider = validateProviderName(providerName);
            const validProfile = validateProfileName(profileName);
            const provider = getProvider(validProvider);

            if (!profileExists(validProvider, validProfile)) {
                fail(`Profile "${validProfile}" does not exist for provider "${validProvider}".`);
            }

            const spinner = createSpinner('Removing profile...');

            spinner.text = 'Deleting token from secure storage...';
            await deleteToken(validProvider, validProfile);

            if (provider.removeAuthSnapshot) {
                spinner.text = 'Removing local auth snapshot...';
                await provider.removeAuthSnapshot(validProfile);
            }

            spinner.text = 'Updating configuration...';
            removeProfile(validProvider, validProfile);

            spinner.succeed(`Profile "${validProfile}" removed from ${validProvider}.`);
        } catch (error: unknown) {
            handleError(error);
        }
    });
