import { Command } from 'commander';
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

// Register providers
registerProvider(vercelProvider);

const program = new Command();

program
    .name('orbit')
    .description('🌍 A fully CLI-based multi-cloud profile manager')
    .version('1.0.0')
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
