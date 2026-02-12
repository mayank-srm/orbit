import { Command } from 'commander';
import { createRequire } from 'node:module';
import { registerProvider } from './providers/provider.interface.js';
import { vercelProvider } from './providers/vercel.js';
import { addCommand } from './commands/add.js';
import { listCommand } from './commands/list.js';
import { removeCommand } from './commands/remove.js';
import { useCommand } from './commands/use.js';
import { runCommand } from './commands/run.js';
import { execCommand } from './commands/exec.js';
import { currentCommand } from './commands/current.js';
import { handleError } from './utils/errorHandler.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string };

// Register providers
registerProvider(vercelProvider);

const program = new Command();

program
    .name('orbit')
    .description('Switch Vercel identities instantly. No logout required.')
    .version(pkg.version)
    .enablePositionalOptions();

program.addCommand(addCommand);
program.addCommand(listCommand);
program.addCommand(removeCommand);
program.addCommand(useCommand);
program.addCommand(runCommand);
program.addCommand(execCommand);
program.addCommand(currentCommand);

try {
    await program.parseAsync(process.argv);
} catch (error: unknown) {
    handleError(error);
}
