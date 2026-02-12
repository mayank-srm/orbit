import { Command } from 'commander';
import ora from 'ora';
import { getProvider } from '../providers/provider.interface.js';
import { setCurrentProfile, profileExists, getCurrentProfile } from '../storage/configStore.js';
import { validateProviderName, validateProfileName } from '../utils/validator.js';
import { logger } from '../utils/logger.js';
import { handleError } from '../utils/errorHandler.js';

export const useCommand = new Command('use')
    .description('Set the current active profile for a provider')
    .argument('<provider>', 'Cloud provider name')
    .argument('<profile>', 'Profile name to activate')
    .action(async (providerName: string, profileName: string) => {
        try {
            const validProvider = validateProviderName(providerName);
            const validProfile = validateProfileName(profileName);
            const provider = getProvider(validProvider);

            if (!profileExists(validProvider, validProfile)) {
                logger.error(`Profile "${validProfile}" does not exist for provider "${provider.name}".`);
                process.exit(1);
            }

            const spinner = ora('Switching profile...').start();

            // Save current profile's auth state before switching
            const currentProfile = getCurrentProfile(validProvider);
            if (currentProfile && currentProfile !== validProfile && provider.captureAuth) {
                try {
                    await provider.captureAuth(currentProfile);
                } catch {
                    // Non-critical
                }
            }

            // Restore target profile's auth state
            if (provider.restoreAuth) {
                const restored = await provider.restoreAuth(validProfile);
                if (restored) {
                    spinner.text = 'Auth credentials restored...';
                }
            }

            setCurrentProfile(validProvider, validProfile);
            spinner.succeed(`Now using profile "${validProfile}" for ${provider.name}.`);
        } catch (error: unknown) {
            handleError(error);
        }
    });
