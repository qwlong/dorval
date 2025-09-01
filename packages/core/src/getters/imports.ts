/**
 * Import management for Dart code generation - aligned with Orval structure
 * Handles import statements and dependencies
 */

export interface DartImport {
  path: string;
  prefix?: string;
  show?: string[];
  hide?: string[];
  isPackage?: boolean;
  isRelative?: boolean;
}

export interface ImportInfo {
  imports: DartImport[];
  exports?: string[];
}

/**
 * Standard Dart imports
 */
export const DART_CORE_IMPORTS = {
  freezed: "import 'package:freezed_annotation/freezed_annotation.dart';",
  jsonSerializable: "import 'package:json_annotation/json_annotation.dart';",
  dio: "import 'package:dio/dio.dart';",
  foundation: "import 'package:flutter/foundation.dart';",
};

/**
 * Create a Dart import statement
 */
export function createImport(
  path: string,
  options?: {
    prefix?: string;
    show?: string[];
    hide?: string[];
    isPackage?: boolean;
  }
): string {
  let importStatement = 'import ';
  
  // Add quotes around path
  const quotedPath = options?.isPackage ? `'package:${path}'` : `'${path}'`;
  importStatement += quotedPath;
  
  // Add prefix if specified
  if (options?.prefix) {
    importStatement += ` as ${options.prefix}`;
  }
  
  // Add show clause if specified
  if (options?.show && options.show.length > 0) {
    importStatement += ` show ${options.show.join(', ')}`;
  }
  
  // Add hide clause if specified
  if (options?.hide && options.hide.length > 0) {
    importStatement += ` hide ${options.hide.join(', ')}`;
  }
  
  importStatement += ';';
  return importStatement;
}

/**
 * Create a part statement for Freezed
 */
export function createPartStatement(fileName: string): string {
  return `part '${fileName}';`;
}

/**
 * Get imports for a model file
 */
export function getModelImports(
  modelName: string,
  dependencies: string[] = [],
  hasEnum: boolean = false
): string[] {
  const imports: string[] = [];
  
  // Always need Freezed for models
  imports.push(DART_CORE_IMPORTS.freezed);
  imports.push(DART_CORE_IMPORTS.jsonSerializable);
  
  // Add Flutter foundation for kDebugMode if needed
  if (hasEnum) {
    imports.push(DART_CORE_IMPORTS.foundation);
  }
  
  // Add part statements
  const snakeCase = toSnakeCase(modelName);
  imports.push('');
  imports.push(createPartStatement(`${snakeCase}.freezed.dart`));
  imports.push(createPartStatement(`${snakeCase}.g.dart`));
  
  // Add dependencies
  if (dependencies.length > 0) {
    imports.push('');
    dependencies.forEach(dep => {
      imports.push(createImport(dep));
    });
  }
  
  return imports;
}

/**
 * Get imports for a service file
 */
export function getServiceImports(
  serviceName: string,
  modelImports: string[] = [],
  usesDio: boolean = true
): string[] {
  const imports: string[] = [];
  
  // Add Dio import if needed
  if (usesDio) {
    imports.push(DART_CORE_IMPORTS.dio);
  }
  
  // Add API client and config
  imports.push(createImport('../api_client.dart'));
  imports.push(createImport('../api_config.dart'));
  imports.push(createImport('api_exception.dart'));
  
  // Add model imports
  if (modelImports.length > 0) {
    imports.push('');
    modelImports.forEach(modelImport => {
      imports.push(createImport(`../models/${modelImport}`));
    });
  }
  
  return imports;
}

/**
 * Convert string to snake_case
 */
function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

/**
 * Get relative import path
 */
export function getRelativeImportPath(from: string, to: string): string {
  // Simple implementation - can be enhanced
  const fromParts = from.split('/');
  const toParts = to.split('/');
  
  // Remove file name from 'from' path
  fromParts.pop();
  
  // Find common base
  let commonIndex = 0;
  while (
    commonIndex < fromParts.length &&
    commonIndex < toParts.length &&
    fromParts[commonIndex] === toParts[commonIndex]
  ) {
    commonIndex++;
  }
  
  // Build relative path
  const upCount = fromParts.length - commonIndex;
  const relativeParts: string[] = [];
  
  // Add '..' for each level up
  for (let i = 0; i < upCount; i++) {
    relativeParts.push('..');
  }
  
  // Add remaining path to target
  relativeParts.push(...toParts.slice(commonIndex));
  
  // If same directory, use './'
  if (relativeParts.length === 0) {
    return './' + toParts[toParts.length - 1];
  }
  
  return relativeParts.join('/');
}

/**
 * Organize imports by type
 */
export function organizeImports(imports: string[]): string[] {
  const dartImports: string[] = [];
  const packageImports: string[] = [];
  const relativeImports: string[] = [];
  const partStatements: string[] = [];
  const exports: string[] = [];
  
  imports.forEach(imp => {
    const trimmed = imp.trim();
    if (!trimmed) return;
    
    if (trimmed.startsWith('import \'dart:')) {
      dartImports.push(trimmed);
    } else if (trimmed.startsWith('import \'package:')) {
      packageImports.push(trimmed);
    } else if (trimmed.startsWith('part ')) {
      partStatements.push(trimmed);
    } else if (trimmed.startsWith('export ')) {
      exports.push(trimmed);
    } else if (trimmed.startsWith('import ')) {
      relativeImports.push(trimmed);
    }
  });
  
  // Combine in Dart convention order
  const organized: string[] = [];
  
  if (dartImports.length > 0) {
    organized.push(...dartImports.sort());
    organized.push('');
  }
  
  if (packageImports.length > 0) {
    organized.push(...packageImports.sort());
    organized.push('');
  }
  
  if (relativeImports.length > 0) {
    organized.push(...relativeImports.sort());
    organized.push('');
  }
  
  if (partStatements.length > 0) {
    organized.push(...partStatements.sort());
    organized.push('');
  }
  
  if (exports.length > 0) {
    organized.push(...exports.sort());
  }
  
  return organized;
}

/**
 * Create barrel file exports
 */
export function createBarrelExports(files: string[]): string[] {
  return files
    .filter(file => !file.includes('.freezed.') && !file.includes('.g.'))
    .map(file => `export '${file}';`)
    .sort();
}