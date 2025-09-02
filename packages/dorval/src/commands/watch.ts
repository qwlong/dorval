/**
 * Watch command implementation
 */

import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { generateDartCode } from '@dorval/core';
import { loadConfig } from '../config.js';

interface WatchOptions {
  config?: string;
}

export async function watchCommand(options: WatchOptions) {
  // Dynamic import for ora to support both CJS and ESM
  const ora = await import('ora').then(m => m.default || m);
  const spinner = ora('Starting watch mode...').start();
  
  try {
    // Load configuration
    const config = await loadConfig(options.config);
    
    if (typeof config.input !== 'string') {
      throw new Error('Watch mode requires a file path input');
    }
    
    const inputPath = path.resolve(config.input);
    
    spinner.succeed(chalk.green(`Watching ${inputPath} for changes...`));
    
    // Initial generation
    await generateDartCode(config);
    console.log(chalk.cyan('✅ Initial generation completed'));
    
    // Watch for changes
    fs.watchFile(inputPath, async () => {
      console.log(chalk.yellow('\n📝 File changed, regenerating...'));
      
      try {
        await generateDartCode(config);
        console.log(chalk.green('✅ Regeneration completed'));
      } catch (error) {
        console.error(chalk.red(`❌ Regeneration failed: ${error instanceof Error ? error.message : String(error)}`));
      }
    });
    
    // Keep process alive
    process.stdin.resume();
    
    // Handle exit
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n👋 Stopping watch mode...'));
      fs.unwatchFile(inputPath);
      process.exit(0);
    });
    
  } catch (error) {
    spinner.fail(chalk.red('Watch mode failed'));
    console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : String(error)}`));
    process.exit(1);
  }
}