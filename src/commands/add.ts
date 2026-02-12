import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import readline from 'node:readline';
import { getProvider } from '../providers/provider.interface.js';
import { storeToken } from '../storage/keychain.js';
import { addProfile, profileExists } from '../storage/configStore.js';
import { validateProviderName, validateProfileName } from '../utils/validator.js';
import { logger } from '../utils/logger.js';
import { handleError } from '../utils/errorHandler.js';

const promptHiddenInput = (prompt: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        // Disable echo for hidden input
        if (process.stdin.isTTY) {
            process.stdout.write(prompt);
            const stdin = process.stdin;
            stdin.setRawMode(true);
            stdin.resume();

            let input = '';

            const onData = (data: Buffer): void => {
                const char = data.toString('utf-8');

                if (char === '\n' || char === '\r' || char === '\u0004') {
                    stdin.setRawMode(false);
                    stdin.removeListener('data', onData);
                    stdin.pause();
                    rl.close();
                    process.stdout.write('\n');
                    resolve(input);
                } else if (char === '\u0003') {
                    // Ctrl+C
                    stdin.setRawMode(false);
                    stdin.removeListener('data', onData);
                    stdin.pause();
                    rl.close();
                    reject(new Error('User cancelled input.'));
                } else if (char === '\u007F' || char === '\b') {
                    // Backspace
                    input = input.slice(0, -1);
                } else {
                    input += char;
                }
            };

            stdin.on('data', onData);
        } else {
            // Non-TTY fallback (piped input)
            rl.question(prompt, (answer) => {
                rl.close();
                resolve(answer);
            });
        }
    });
};

const confirmInput = (prompt: string): Promise<boolean> => {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        rl.question(prompt, (answer) => {
            rl.close();
            const normalized = answer.trim().toLowerCase();
            resolve(normalized === 'y' || normalized === 'yes' || normalized === '');
        });
    });
};

export const addCommand = new Command('add')
    .description('Add a new cloud provider profile')
    .argument('<provider>', 'Cloud provider name (e.g., vercel)')
    .argument('<profile>', 'Profile name (e.g., personal, company)')
    .action(async (providerName: string, profileName: string) => {
        try {
            const validProvider = validateProviderName(providerName);
            const validProfile = validateProfileName(profileName);
            const provider = getProvider(validProvider);

            if (profileExists(validProvider, validProfile)) {
                logger.warn(`Profile "${validProfile}" already exists for ${provider.name}. It will be overwritten.`);
            }

            let token = '';
            let storedTokenFound = false;

            if (provider.getStoredToken) {
                const spinner = ora(`Checking for existing ${provider.name} credentials...`).start();
                try {
                    const storedToken = await provider.getStoredToken();
                    spinner.stop();

                    if (storedToken) {
                        storedTokenFound = true;
                        let emailDisplay = '';
                        if (provider.getUserEmail) {
                            try {
                                const email = await provider.getUserEmail(storedToken);
                                if (email) emailDisplay = ` (${chalk.cyan(email)})`;
                            } catch {
                                // Ignore email fetch error
                            }
                        }

                        const useStored = await confirmInput(
                            `Found existing token${emailDisplay} from ${provider.name} CLI. Use this? (Y/n) `,
                        );
                        if (useStored) {
                            token = storedToken;
                        }
                    }
                } catch {
                    spinner.stop();
                    // Ignore errors during auto-discovery
                }
            }

            if (!token && provider.login) {
                const promptMsg = storedTokenFound
                    ? `Login to a different account with ${provider.name} CLI? (Y/n) `
                    : `No existing credentials found. Login with ${provider.name} CLI now? (Y/n) `;

                const shouldLogin = await confirmInput(promptMsg);

                if (shouldLogin) {
                    const loginSuccess = await provider.login();
                    if (loginSuccess) {
                        // Re-check for token
                        if (provider.getStoredToken) {
                            const spinner = ora('Checking for new credentials...').start();
                            try {
                                const storedToken = await provider.getStoredToken();
                                spinner.stop();
                                if (storedToken) {
                                    token = storedToken;
                                    logger.success('New credentials found!');
                                }
                            } catch {
                                spinner.stop();
                            }
                        }
                    } else {
                        logger.warn('Login failed or was cancelled.');
                    }
                }
            }

            if (!token) {
                token = await promptHiddenInput(`🔑 Enter token for ${provider.name}/${validProfile}: `);
            }

            if (!token.trim()) {
                logger.error('Token cannot be empty.');
                process.exit(1);
            }

            const spinner = ora('Validating token...').start();

            if (!provider.validateToken(token.trim())) {
                spinner.fail('Token validation failed.');
                logger.error(`Invalid token format for ${provider.name}. Please check your token and try again.`);
                process.exit(1);
            }

            spinner.text = 'Storing token securely...';
            await storeToken(validProvider, validProfile, token.trim());

            if (provider.getUserEmail) {
                spinner.text = 'Fetching user info...';
                try {
                    const email = await provider.getUserEmail(token.trim());
                    if (email) {
                        spinner.text = `Found user: ${email}. Updating configuration...`;
                        addProfile(validProvider, validProfile, { email });
                    } else {
                        addProfile(validProvider, validProfile);
                    }
                } catch {
                    addProfile(validProvider, validProfile);
                }
            } else {
                addProfile(validProvider, validProfile);
            }

            spinner.succeed(`Profile "${validProfile}" added for ${provider.name}.`);

            // Capture auth.json snapshot for this profile
            if (provider.captureAuth) {
                try {
                    await provider.captureAuth(validProfile);
                } catch {
                    // Non-critical: auth capture failure doesn't block profile creation
                }
            }
        } catch (error: unknown) {
            handleError(error);
        }
    });
