#!/usr/bin/env node

/**
 * Dorval CLI entry point
 */

import { program } from 'commander';
import chalk from 'chalk';
import { generateCommand } from '../commands/generate.js';
import { watchCommand } from '../commands/watch.js';
import { version } from '../../package.json';

program
  .name('dorval')
  .description('Generate Dart API clients from OpenAPI specifications')
  .version(version);

// Generate command
program
  .command('generate')
  .alias('gen')
  .description('Generate Dart code from OpenAPI spec')
  .option('-c, --config <path>', 'Path to config file')
  .option('-i, --input <path>', 'OpenAPI spec file or URL')
  .option('-o, --output <path>', 'Output directory')
  .option('--client <type>', 'Client type (dio, http, chopper)', 'dio')
  .option('--watch', 'Watch for changes')
  .action(generateCommand);

// Watch command
program
  .command('watch')
  .description('Watch OpenAPI spec for changes and regenerate')
  .option('-c, --config <path>', 'Path to config file')
  .action(watchCommand);

// Default action
program
  .action(() => {
    console.log(chalk.cyan(`
🎯 Dorval v${version}
Generate type-safe Dart API clients from OpenAPI specifications.

Usage:
  dorval generate [options]
  dorval watch [options]

Run 'dorval --help' for more information.
    `));
  });

// Parse command line arguments
program.parse(process.argv);

// Show help if no arguments
if (!process.argv.slice(2).length) {
  program.outputHelp();
}