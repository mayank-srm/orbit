import { Command } from 'commander';
import { getProvider } from '../providers/provider.interface.js';
import { setCurrentProfile, profileExists, getCurrentProfile } from '../storage/configStore.js';
import { validateProviderName, validateProfileName } from '../utils/validator.js';
import { handleError } from '../utils/errorHandler.js';
import { fail } from '../utils/cliError.js';
import { createSpinner } from '../utils/spinner.js';

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
                fail(`Profile "${validProfile}" does not exist for provider "${provider.name}".`);
            }

            const spinner = createSpinner('Switching profile...');

            try {
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
                    if (!restored) {
                        fail(
                            `No saved auth snapshot found for ${provider.name}/${validProfile}. Re-add the profile with "orbit add ${validProvider} ${validProfile}" to capture credentials.`,
                        );
                    }
                    spinner.text = 'Auth credentials restored...';
                }

                setCurrentProfile(validProvider, validProfile);
                spinner.succeed(`Now using profile "${validProfile}" for ${provider.name}.`);
            } catch (error: unknown) {
                spinner.fail('Failed to switch profile.');
                throw error;
            }
        } catch (error: unknown) {
            handleError(error);
        }
    });
