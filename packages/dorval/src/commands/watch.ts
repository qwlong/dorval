/**
 * Watch command implementation
 */

import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { generateDartCode } from '@dorval/core';
import { loadConfig } from '../config';

// Simple spinner implementation (same as in generate.ts)
class SimpleSpinner {
  private message: string;
  
  constructor(message: string) {
    this.message = message;
  }
  
  start() {
    console.log(chalk.cyan(`⏳ ${this.message}`));
    return this;
  }
  
  succeed(message?: string) {
    console.log(chalk.green(`✅ ${message || this.message}`));
    return this;
  }
  
  fail(message?: string) {
    console.log(chalk.red(`❌ ${message || this.message}`));
    return this;
  }
  
  text(message: string) {
    this.message = message;
    console.log(chalk.cyan(`⏳ ${message}`));
    return this;
  }
}

interface WatchOptions {
  config?: string;
}

export async function watchCommand(options: WatchOptions) {
  const spinner = new SimpleSpinner('Starting watch mode...');
  spinner.start();
  
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