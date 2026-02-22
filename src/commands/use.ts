import { Command } from 'commander';
import { getProvider } from '../providers/provider.interface.js';
import { setCurrentProfile, profileExists, getCurrentProfile } from '../storage/configStore.js';
import { getToken } from '../storage/keychain.js';
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
                if (provider.restoreAuth && currentProfile !== validProfile) {
                    const restoredSnapshot = await provider.restoreAuth(validProfile);
                    if (!restoredSnapshot) {
                        fail(
                            `No saved auth snapshot found for ${provider.name}/${validProfile}. Re-add the profile with "orbit add ${validProvider} ${validProfile}" to capture credentials.`,
                        );
                    }
                    spinner.text = 'Auth credentials restored...';
                }

                const authValid = provider.validateActiveAuth
                    ? await provider.validateActiveAuth()
                    : true;

                if (!authValid) {
                    let recovered = false;

                    if (provider.seedAuthFromToken) {
                        const savedToken = await getToken(validProvider, validProfile);
                        if (savedToken && provider.validateToken(savedToken)) {
                            spinner.text = 'Refreshing auth from saved token...';
                            const seeded = await provider.seedAuthFromToken(savedToken);
                            if (seeded) {
                                recovered = provider.validateActiveAuth
                                    ? await provider.validateActiveAuth()
                                    : true;
                            }
                        }
                    }

                    if (!recovered) {
                        // Roll back auth state to previous profile when possible.
                        if (currentProfile && currentProfile !== validProfile && provider.restoreAuth) {
                            try {
                                await provider.restoreAuth(currentProfile);
                            } catch {
                                // Non-critical rollback failure.
                            }
                        }
                        fail(
                            `Credentials for ${provider.name}/${validProfile} are invalid or expired. Re-authenticate with "${provider.getCliName()} login", then refresh Orbit with "orbit add ${validProvider} ${validProfile}".`,
                        );
                    }
                }

                if (provider.captureAuth) {
                    try {
                        await provider.captureAuth(validProfile);
                    } catch {
                        // Non-critical
                    }
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
