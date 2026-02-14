import { Command } from 'commander';
import { execa } from 'execa';
import { getProvider } from '../providers/provider.interface.js';
import { getToken } from '../storage/keychain.js';
import { profileExists, getCurrentProfile } from '../storage/configStore.js';
import { validateProviderName, validateProfileName } from '../utils/validator.js';
import { logger } from '../utils/logger.js';
import { handleError } from '../utils/errorHandler.js';
import { fail } from '../utils/cliError.js';

export const runCommand = new Command('run')
    .description('Run a command with a specific provider profile')
    .argument('<provider>', 'Cloud provider name')
    .argument('<profile>', 'Profile name to use')
    .argument('<args...>', 'Command arguments to pass to the provider CLI')
    .passThroughOptions()
    .allowUnknownOption()
    .action(async (providerName: string, profileName: string, args: string[]) => {
        try {
            const validProvider = validateProviderName(providerName);
            const validProfile = validateProfileName(profileName);
            const provider = getProvider(validProvider);

            if (!profileExists(validProvider, validProfile)) {
                fail(`Profile "${validProfile}" does not exist for provider "${provider.name}".`);
            }

            logger.info(`Running as ${provider.name}/${validProfile}...`);

            // Save current auth state and swap to target profile
            const currentProfile = getCurrentProfile(validProvider);
            let swapped = false;

            if (provider.restoreAuth) {
                // Save current auth state first
                if (currentProfile && currentProfile !== validProfile && provider.captureAuth) {
                    try {
                        await provider.captureAuth(currentProfile);
                    } catch {
                        // Non-critical
                    }
                }

                // Restore target profile's auth
                swapped = await provider.restoreAuth(validProfile);
                if (!swapped) {
                    logger.warn(
                        `No local auth snapshot found for ${provider.name}/${validProfile}. Using token fallback.`,
                    );
                }
            }

            try {
                if (swapped) {
                    // Auth swapped — run natively (no env injection needed)
                    const cliName = provider.getCliName();
                    const result = await execa(cliName, args, {
                        stdio: 'inherit',
                        reject: false,
                    });
                    process.exitCode = result.exitCode ?? 0;
                } else {
                    // Fallback: inject VERCEL_TOKEN (for providers without auth swap)
                    const token = await getToken(validProvider, validProfile);
                    if (!token) {
                        fail(
                            `No token found for ${provider.name}/${validProfile}. Try adding it again with "orbit add".`,
                        );
                        return;
                    }
                    const envToken = token;

                    const cliName = provider.getCliName();
                    const envVar = provider.getEnvVar();

                    const result = await execa(cliName, args, {
                        env: {
                            ...process.env,
                            [envVar]: envToken,
                        },
                        stdio: 'inherit',
                        reject: false,
                    });
                    process.exitCode = result.exitCode ?? 0;
                }
            } finally {
                // Restore previous profile's auth
                if (swapped && currentProfile && currentProfile !== validProfile && provider.restoreAuth) {
                    try {
                        await provider.restoreAuth(currentProfile);
                    } catch {
                        // Non-critical
                    }
                }
            }
        } catch (error: unknown) {
            handleError(error);
        }
    });
