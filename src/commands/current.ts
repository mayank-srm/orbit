import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from '../storage/configStore.js';
import { logger } from '../utils/logger.js';
import { handleError } from '../utils/errorHandler.js';

export const currentCommand = new Command('current')
    .description('Show current active profiles')
    .action(() => {
        try {
            const config = loadConfig();
            const providers = Object.keys(config.providers);

            if (logger.isJsonMode()) {
                const current = providers
                    .map((providerName) => {
                        const providerConfig = config.providers[providerName];
                        if (!providerConfig?.current) {
                            return null;
                        }
                        return {
                            provider: providerName,
                            profile: providerConfig.current,
                        };
                    })
                    .filter((entry): entry is { provider: string; profile: string } => entry !== null);

                logger.json({
                    ok: true,
                    current,
                });
                return;
            }

            if (providers.length === 0) {
                logger.info('No profiles configured yet.');
                return;
            }

            let hasActive = false;

            for (const providerName of providers) {
                const providerConfig = config.providers[providerName];
                if (providerConfig?.current) {
                    logger.success(
                        `${chalk.bold(providerName)}: ${chalk.cyan(providerConfig.current)}`,
                    );
                    hasActive = true;
                }
            }

            if (!hasActive) {
                logger.info('No active profiles set. Use "orbit use <provider> <profile>" to set one.');
            }
        } catch (error: unknown) {
            handleError(error);
        }
    });
