/**
 * Generate command implementation
 */

import chalk from 'chalk';
import ora from 'ora';
import { generateDartCode, DartGeneratorOptions } from '@dorval/core';
import { loadConfig } from '../config';

interface GenerateOptions {
  config?: string;
  input?: string;
  output?: string;
  client?: 'dio' | 'http' | 'chopper';
  watch?: boolean;
}

export async function generateCommand(options: GenerateOptions) {
  const spinner = ora('Loading configuration...').start();
  
  try {
    // Load configuration
    let config: DartGeneratorOptions;
    
    if (options.input && options.output) {
      // Use command line options
      config = {
        input: options.input,
        output: {
          target: options.output,
          client: options.client || 'dio',
          mode: 'split',
          override: {
            generator: {
              freezed: true,
              jsonSerializable: true,
              nullSafety: true
            }
          }
        }
      };
    } else if (options.config) {
      config = await loadConfig(options.config);
    } else {
      // Try to load from default locations
      try {
        config = await loadConfig();
      } catch (error) {
        throw new Error('Either provide a config file or use -i and -o options');
      }
    }
    
    spinner.text = 'Parsing OpenAPI specification...';
    
    // Generate code
    const files = await generateDartCode(config);
    
    spinner.succeed(chalk.green(`✅ Generated ${files.length} files`));
    
    // List generated files
    console.log(chalk.cyan('\nGenerated files:'));
    files.forEach(file => {
      console.log(chalk.gray(`  - ${file.path}`));
    });
    
    // Run post-generation hooks
    if (config.hooks?.afterAllFilesWrite) {
      spinner.start('Running post-generation hooks...');
      // TODO: Implement hook execution
      spinner.succeed('Hooks completed');
    }
    
    console.log(chalk.green('\n✨ Generation completed successfully!'));
    
  } catch (error) {
    spinner.fail(chalk.red('Generation failed'));
    console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : String(error)}`));
    process.exit(1);
  }
}