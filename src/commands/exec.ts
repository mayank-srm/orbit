import { Command } from 'commander';
import { execa } from 'execa';
import { getProvider } from '../providers/provider.interface.js';
import { getToken } from '../storage/keychain.js';
import { getCurrentProfile } from '../storage/configStore.js';
import { validateProviderName } from '../utils/validator.js';
import { logger } from '../utils/logger.js';
import { handleError } from '../utils/errorHandler.js';
import { fail } from '../utils/cliError.js';

export const execCommand = new Command('exec')
    .description('Execute a command using the current active profile')
    .argument('<provider>', 'Cloud provider name')
    .argument('<args...>', 'Command arguments to pass to the provider CLI')
    .passThroughOptions()
    .allowUnknownOption()
    .action(async (providerName: string, args: string[]) => {
        try {
            const validProvider = validateProviderName(providerName);
            const provider = getProvider(validProvider);

            const currentProfile = getCurrentProfile(validProvider);

            if (!currentProfile) {
                fail(`No active profile set for ${provider.name}. Use "orbit use ${validProvider} <profile>" first.`);
                return;
            }
            const activeProfile = currentProfile;

            const cliName = provider.getCliName();

            logger.info(`Running as ${provider.name}/${activeProfile}...`);

            let swapped = false;
            if (provider.restoreAuth) {
                swapped = await provider.restoreAuth(activeProfile);
            }

            if (swapped) {
                // Native execution path only when local auth snapshot was restored
                const result = await execa(cliName, args, {
                    stdio: 'inherit',
                    reject: false,
                });
                process.exitCode = result.exitCode ?? 0;
                return;
            }

            if (provider.restoreAuth) {
                logger.warn(
                    `Unable to restore local auth snapshot for ${provider.name}/${activeProfile}. Falling back to token-based execution.`,
                );
            }

            // Fallback: inject env var
            const token = await getToken(validProvider, activeProfile);

            if (!token) {
                fail(
                    `No token found for ${provider.name}/${activeProfile}. Cannot verify identity; try "orbit add ${validProvider} ${activeProfile}" first.`,
                );
                return;
            }
            const envToken = token;

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
        } catch (error: unknown) {
            handleError(error);
        }
    });
