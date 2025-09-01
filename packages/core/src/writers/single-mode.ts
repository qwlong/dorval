/**
 * Single mode writer - aligned with Orval structure
 * Writes all generated code into a single file
 */

import { GeneratedFile } from '../types';

export interface SingleModeOptions {
  filename?: string;
  includeHeader?: boolean;
  includeFooter?: boolean;
  organizeByType?: boolean;
}

/**
 * Write all files in single mode (everything in one file)
 */
export async function writeSingleMode(
  files: GeneratedFile[],
  outputPath: string,
  options?: SingleModeOptions
): Promise<GeneratedFile[]> {
  const filename = options?.filename || 'api.dart';
  
  // Collect all content
  const sections = organizeSections(files, options?.organizeByType ?? true);
  
  // Build final content
  let content = '';
  
  // Add header
  if (options?.includeHeader !== false) {
    content += generateHeader();
  }
  
  // Add imports
  content += generateImports(sections);
  content += '\n';
  
  // Add models section
  if (sections.models.length > 0) {
    content += '// ============================================\n';
    content += '// Models\n';
    content += '// ============================================\n\n';
    content += combineModels(sections.models);
    content += '\n';
  }
  
  // Add client section
  if (sections.client.length > 0) {
    content += '// ============================================\n';
    content += '// API Client & Configuration\n';
    content += '// ============================================\n\n';
    content += combineClient(sections.client);
    content += '\n';
  }
  
  // Add services section
  if (sections.services.length > 0) {
    content += '// ============================================\n';
    content += '// Services\n';
    content += '// ============================================\n\n';
    content += combineServices(sections.services);
    content += '\n';
  }
  
  // Add footer
  if (options?.includeFooter) {
    content += generateFooter();
  }
  
  return [{
    path: filename,
    content
  }];
}

/**
 * Organize files into sections
 */
function organizeSections(files: GeneratedFile[], organizeByType: boolean): {
  models: GeneratedFile[];
  services: GeneratedFile[];
  client: GeneratedFile[];
  other: GeneratedFile[];
} {
  if (!organizeByType) {
    // Return all as "other" if not organizing
    return {
      models: [],
      services: [],
      client: [],
      other: files
    };
  }
  
  const models: GeneratedFile[] = [];
  const services: GeneratedFile[] = [];
  const client: GeneratedFile[] = [];
  const other: GeneratedFile[] = [];
  
  files.forEach(file => {
    if (file.path.startsWith('models/')) {
      // Skip generated files
      if (!file.path.includes('.freezed.') && !file.path.includes('.g.')) {
        models.push(file);
      }
    } else if (file.path.startsWith('services/')) {
      services.push(file);
    } else if (
      file.path === 'api_client.dart' ||
      file.path === 'api_config.dart'
    ) {
      client.push(file);
    } else if (file.path === 'services/api_exception.dart') {
      // Include exception with services
      services.push(file);
    } else {
      other.push(file);
    }
  });
  
  return { models, services, client, other };
}

/**
 * Generate file header
 */
function generateHeader(): string {
  return `// ============================================
// Generated API Client
// Generated with Dorval (Dart + Orval)
// ============================================
// ignore_for_file: type=lint
// coverage:ignore-file

`;
}

/**
 * Generate imports section
 */
function generateImports(sections: ReturnType<typeof organizeSections>): string {
  const imports = new Set<string>();
  
  // Standard Dart imports
  imports.add("import 'dart:convert';");
  imports.add("import 'dart:typed_data';");
  
  // Package imports
  imports.add("import 'package:dio/dio.dart';");
  imports.add("import 'package:freezed_annotation/freezed_annotation.dart';");
  imports.add("import 'package:json_annotation/json_annotation.dart';");
  imports.add("import 'package:flutter/foundation.dart';");
  
  // Part statements for Freezed (handled differently in single file mode)
  // In single mode, we'd need to handle this differently or not use Freezed
  
  return Array.from(imports).join('\n') + '\n';
}

/**
 * Combine models into single section
 */
function combineModels(models: GeneratedFile[]): string {
  // Sort models by dependencies (simple models first)
  const sortedModels = sortModelsByDependencies(models);
  
  return sortedModels.map(model => {
    // Extract model content without imports and part statements
    const content = stripImportsAndParts(model.content);
    
    return `// Model: ${model.path}
${content}`;
  }).join('\n\n');
}

/**
 * Combine client files
 */
function combineClient(client: GeneratedFile[]): string {
  return client.map(file => {
    const content = stripImportsAndParts(file.content);
    
    return `// ${file.path}
${content}`;
  }).join('\n\n');
}

/**
 * Combine services
 */
function combineServices(services: GeneratedFile[]): string {
  // Sort services alphabetically
  const sortedServices = [...services].sort((a, b) => a.path.localeCompare(b.path));
  
  return sortedServices.map(service => {
    const content = stripImportsAndParts(service.content);
    
    return `// Service: ${service.path}
${content}`;
  }).join('\n\n');
}

/**
 * Generate footer
 */
function generateFooter(): string {
  return `
// ============================================
// End of generated code
// ============================================
`;
}

/**
 * Strip imports and part statements from content
 */
function stripImportsAndParts(content: string): string {
  const lines = content.split('\n');
  const filteredLines: string[] = [];
  let skipNext = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip import statements
    if (trimmed.startsWith('import ')) {
      continue;
    }
    
    // Skip part statements
    if (trimmed.startsWith('part ')) {
      continue;
    }
    
    // Skip library statements
    if (trimmed.startsWith('library ')) {
      continue;
    }
    
    // Skip export statements in single mode
    if (trimmed.startsWith('export ')) {
      continue;
    }
    
    // Skip empty lines at the beginning
    if (filteredLines.length === 0 && trimmed === '') {
      continue;
    }
    
    filteredLines.push(line);
  }
  
  // Remove trailing empty lines
  while (filteredLines.length > 0 && filteredLines[filteredLines.length - 1].trim() === '') {
    filteredLines.pop();
  }
  
  return filteredLines.join('\n');
}

/**
 * Sort models by dependencies (simple attempt)
 */
function sortModelsByDependencies(models: GeneratedFile[]): GeneratedFile[] {
  // Simple heuristic: enums first, then simple models, then complex ones
  const enums: GeneratedFile[] = [];
  const simple: GeneratedFile[] = [];
  const complex: GeneratedFile[] = [];
  
  models.forEach(model => {
    if (model.content.includes('enum ')) {
      enums.push(model);
    } else if (model.content.includes('extends') || model.content.includes('implements')) {
      complex.push(model);
    } else {
      simple.push(model);
    }
  });
  
  return [...enums, ...simple, ...complex];
}

/**
 * Single mode configuration
 */
export interface SingleModeConfig {
  /**
   * Output filename
   */
  filename?: string;
  
  /**
   * Include generated header
   */
  includeHeader?: boolean;
  
  /**
   * Include generated footer
   */
  includeFooter?: boolean;
  
  /**
   * Organize content by type
   */
  organizeByType?: boolean;
  
  /**
   * Custom content processor
   */
  processContent?: (content: string, file: GeneratedFile) => string;
}

/**
 * Create single mode writer with configuration
 */
export function createSingleModeWriter(config?: SingleModeConfig) {
  return async (files: GeneratedFile[], outputPath: string) => {
    return writeSingleMode(files, outputPath, config);
  };
}