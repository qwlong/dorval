/**
 * @dorval/core
 * Core library for generating Dart code from OpenAPI specifications
 */

export * from './parser';
export * from './generators';
export * from './utils';

// Main generation function
export { generateDartCode } from './generators';

// Type definitions
export type {
  DartGeneratorOptions,
  DartOutputMode,
  DartClientType,
  GeneratedFile,
  DartConfig,
  DartConfigExport
} from './types';

// Import types for use in defineConfig
import type { DartConfig } from './types';

// Configuration helper
export function defineConfig(config: DartConfig): DartConfig {
  return config;
}