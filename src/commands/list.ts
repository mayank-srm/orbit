import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from '../storage/configStore.js';
import { logger } from '../utils/logger.js';
import { handleError } from '../utils/errorHandler.js';

export const listCommand = new Command('list')
    .description('List all profiles across providers')
    .action(() => {
        try {
            const config = loadConfig();
            const providers = Object.keys(config.providers);

            if (logger.isJsonMode()) {
                const payload = providers.map((providerName) => {
                    const providerConfig = config.providers[providerName];
                    return {
                        provider: providerName,
                        current: providerConfig?.current ?? null,
                        profiles: (providerConfig?.profiles ?? []).map((profile) => ({
                            name: profile,
                            email: providerConfig?.metadata?.[profile]?.email ?? null,
                            isCurrent: providerConfig?.current === profile,
                        })),
                    };
                });

                logger.json({
                    ok: true,
                    providers: payload,
                });
                return;
            }

            if (providers.length === 0) {
                logger.info('No profiles configured yet. Use "orbit add <provider> <profile>" to get started.');
                return;
            }

            logger.newline();
            logger.plain(
                `  ${chalk.bold.underline('Provider'.padEnd(15))} ${chalk.bold.underline('Profile'.padEnd(20))} ${chalk.bold.underline('Email'.padEnd(30))} ${chalk.bold.underline('Status')}`,
            );
            logger.newline();

            for (const providerName of providers) {
                const providerConfig = config.providers[providerName];
                if (!providerConfig) continue;

                for (const profile of providerConfig.profiles) {
                    const isCurrent = providerConfig.current === profile;
                    const email = providerConfig.metadata?.[profile]?.email ?? '-';
                    const status = isCurrent ? chalk.green('★ current') : chalk.dim('—');

                    const providerDisplay = isCurrent
                        ? chalk.cyan(providerName.padEnd(15))
                        : chalk.white(providerName.padEnd(15));
                    const profileDisplay = isCurrent
                        ? chalk.cyan(profile.padEnd(20))
                        : chalk.white(profile.padEnd(20));
                    const emailDisplay = isCurrent
                        ? chalk.cyan(email.padEnd(30))
                        : chalk.gray(email.padEnd(30));

                    logger.plain(`  ${providerDisplay} ${profileDisplay} ${emailDisplay} ${status}`);
                }
            }

            logger.newline();
        } catch (error: unknown) {
            handleError(error);
        }
    });
