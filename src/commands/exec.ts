import { Command } from 'commander';
import { execa } from 'execa';
import { getProvider } from '../providers/provider.interface.js';
import { getToken } from '../storage/keychain.js';
import { getCurrentProfile } from '../storage/configStore.js';
import { validateProviderName } from '../utils/validator.js';
import { logger } from '../utils/logger.js';
import { handleError } from '../utils/errorHandler.js';

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
                logger.error(
                    `No active profile set for ${provider.name}. Use "orbit use ${validProvider} <profile>" first.`,
                );
                process.exit(1);
            }

            // Ensure current profile's auth is active
            if (provider.restoreAuth) {
                await provider.restoreAuth(currentProfile);
            }

            const cliName = provider.getCliName();

            logger.info(`Running as ${provider.name}/${currentProfile}...`);

            // Try native execution first (auth.json is already swapped)
            if (provider.getAuthConfigPath?.()) {
                const result = await execa(cliName, args, {
                    stdio: 'inherit',
                    reject: false,
                });
                process.exit(result.exitCode ?? 0);
            }

            // Fallback: inject env var
            const token = await getToken(validProvider, currentProfile);

            if (!token) {
                logger.error(
                    `No token found for ${provider.name}/${currentProfile}. Try adding it again with "orbit add".`,
                );
                process.exit(1);
            }

            const envVar = provider.getEnvVar();

            const result = await execa(cliName, args, {
                env: {
                    ...process.env,
                    [envVar]: token,
                },
                stdio: 'inherit',
                reject: false,
            });

            process.exit(result.exitCode ?? 0);
        } catch (error: unknown) {
            handleError(error);
        }
    });
