/**
 * Split mode writer - aligned with Orval structure
 * Writes models, services, and client files separately
 */

import { GeneratedFile } from '../types';
import * as path from 'path';

export interface SplitModeOptions {
  models: GeneratedFile[];
  services: GeneratedFile[];
  client: GeneratedFile[];
  indexFiles?: boolean;
  barrelExports?: boolean;
}

/**
 * Write files in split mode (models, services, client separated)
 */
export async function writeSplitMode(
  files: GeneratedFile[],
  outputPath: string,
  options?: Partial<SplitModeOptions>
): Promise<GeneratedFile[]> {
  const result: GeneratedFile[] = [];
  
  // Categorize files
  const categorized = categorizeFiles(files);
  
  // Process models
  if (categorized.models.length > 0) {
    result.push(...categorized.models);
    
    // Generate models index if requested
    if (options?.indexFiles !== false) {
      result.push(generateModelsIndex(categorized.models));
    }
  }
  
  // Process services
  if (categorized.services.length > 0) {
    result.push(...categorized.services);
    
    // Generate services index if requested
    if (options?.indexFiles !== false) {
      result.push(generateServicesIndex(categorized.services));
    }
  }
  
  // Process client files
  if (categorized.client.length > 0) {
    result.push(...categorized.client);
  }
  
  // Process other files
  if (categorized.other.length > 0) {
    result.push(...categorized.other);
  }
  
  // Generate main barrel export if requested
  if (options?.barrelExports) {
    result.push(generateMainBarrel());
  }
  
  return result;
}

/**
 * Categorize files by type
 */
function categorizeFiles(files: GeneratedFile[]): {
  models: GeneratedFile[];
  services: GeneratedFile[];
  client: GeneratedFile[];
  other: GeneratedFile[];
} {
  const models: GeneratedFile[] = [];
  const services: GeneratedFile[] = [];
  const client: GeneratedFile[] = [];
  const other: GeneratedFile[] = [];
  
  files.forEach(file => {
    if (file.path.startsWith('models/')) {
      models.push(file);
    } else if (file.path.startsWith('services/')) {
      services.push(file);
    } else if (
      file.path === 'api_client.dart' ||
      file.path === 'api_config.dart' ||
      file.path === 'api_exception.dart'
    ) {
      client.push(file);
    } else {
      other.push(file);
    }
  });
  
  return { models, services, client, other };
}

/**
 * Generate models/index.dart
 */
function generateModelsIndex(models: GeneratedFile[]): GeneratedFile {
  const exports: string[] = [];
  
  // Sort models for consistent output
  const sortedModels = [...models].sort((a, b) => a.path.localeCompare(b.path));
  
  sortedModels.forEach(model => {
    // Extract filename without path
    const filename = path.basename(model.path);
    
    // Skip generated files like .freezed.dart and .g.dart
    if (!filename.includes('.freezed.') && !filename.includes('.g.')) {
      exports.push(`export '${filename}';`);
    }
  });
  
  const content = `// Export all models
${exports.join('\n')}
`;
  
  return {
    path: 'models/index.dart',
    content
  };
}

/**
 * Generate services/index.dart
 */
function generateServicesIndex(services: GeneratedFile[]): GeneratedFile {
  const exports: string[] = [];
  
  // Sort services for consistent output
  const sortedServices = [...services].sort((a, b) => a.path.localeCompare(b.path));
  
  sortedServices.forEach(service => {
    // Extract filename without path
    const filename = path.basename(service.path);
    
    // Skip non-service files
    if (filename.endsWith('_service.dart')) {
      exports.push(`export '${filename}';`);
    }
  });
  
  // Add common exports
  exports.push(`export 'api_exception.dart';`);
  
  const content = `// Export all services
${exports.join('\n')}
`;
  
  return {
    path: 'services/index.dart',
    content
  };
}

/**
 * Generate main barrel export file
 */
function generateMainBarrel(): GeneratedFile {
  const content = `// Main barrel export file
// Re-exports all public APIs

// Models
export 'models/index.dart';

// Services
export 'services/index.dart';

// Client
export 'api_client.dart';
export 'api_config.dart';
`;
  
  return {
    path: 'index.dart',
    content
  };
}

/**
 * Split mode configuration
 */
export interface SplitModeConfig {
  /**
   * Generate index files for models and services
   */
  generateIndexFiles?: boolean;
  
  /**
   * Generate main barrel export
   */
  generateBarrelExport?: boolean;
  
  /**
   * Custom categorization function
   */
  categorize?: (file: GeneratedFile) => 'models' | 'services' | 'client' | 'other';
  
  /**
   * Custom index generation
   */
  customIndexGenerator?: (files: GeneratedFile[], type: string) => GeneratedFile | null;
}

/**
 * Create split mode writer with configuration
 */
export function createSplitModeWriter(config?: SplitModeConfig) {
  return async (files: GeneratedFile[], outputPath: string) => {
    return writeSplitMode(files, outputPath, {
      indexFiles: config?.generateIndexFiles,
      barrelExports: config?.generateBarrelExport
    });
  };
}