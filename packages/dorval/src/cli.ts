/**
 * CLI runner for programmatic usage
 */

import { Command } from 'commander';
import { generateCommand } from './commands/generate';
import { watchCommand } from './commands/watch';

export function runCLI(args: string[]): void {
  const program = new Command();
  
  program
    .name('dorval')
    .description('Generate Dart API clients from OpenAPI specifications');
  
  program
    .command('generate')
    .description('Generate Dart code')
    .option('-c, --config <path>', 'Config file path')
    .option('-i, --input <path>', 'Input spec')
    .option('-o, --output <path>', 'Output directory')
    .action(generateCommand);
  
  program
    .command('watch')
    .description('Watch for changes')
    .option('-c, --config <path>', 'Config file path')
    .action(watchCommand);
  
  program.parse(args);
}