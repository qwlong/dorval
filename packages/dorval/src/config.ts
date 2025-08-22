/**
 * Configuration loader
 */

import { cosmiconfigSync } from 'cosmiconfig';
import { DartGeneratorOptions } from '@dorval/core';

// Create explorer lazily to avoid initialization issues
function getExplorer() {
  return cosmiconfigSync('orval', {
    searchPlaces: [
      'orval.config.ts',
      'orval.config.js',
      'orval.config.cjs',
      '.orvalrc',
      '.orvalrc.json',
      '.orvalrc.yaml',
      '.orvalrc.yml',
      'package.json'
    ]
  });
}

export async function loadConfig(configPath?: string): Promise<DartGeneratorOptions> {
  const explorer = getExplorer();
  const result = configPath
    ? explorer.load(configPath)
    : explorer.search();
  
  if (!result) {
    throw new Error('No configuration file found');
  }
  
  // Handle default export or direct config
  const config = result.config.default || result.config;
  
  // If config has multiple specs, use the first one
  if (typeof config === 'object' && !config.input) {
    const firstKey = Object.keys(config)[0];
    return config[firstKey];
  }
  
  return config;
}