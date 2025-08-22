/**
 * Configurable header generator that uses user-defined shared header configurations
 */

import { GeneratedFile } from '../types';
import { TypeMapper } from '../utils/type-mapper';
import { TemplateManager } from '../templates/template-manager';
import { HeaderParameter } from './endpoint-generator';

export interface SharedHeaderConfig {
  [className: string]: string[];  // className -> [header names]
}

export class ConfigurableHeaderGenerator {
  private templateManager: TemplateManager;
  private sharedHeaderConfig: SharedHeaderConfig;
  private headerModels: Map<string, SharedHeaderModel> = new Map();
  private usedSharedModels: Set<string> = new Set();

  constructor(sharedHeaderConfig?: SharedHeaderConfig) {
    this.templateManager = new TemplateManager();
    this.sharedHeaderConfig = sharedHeaderConfig || {};
  }

  /**
   * Get the appropriate header model name for a set of headers
   * Returns shared model name if headers match a configured pattern, 
   * otherwise returns a unique model name
   */
  getHeaderModelName(methodName: string, headers: HeaderParameter[]): string | null {
    if (headers.length === 0) {
      return null;
    }

    // Check if these headers match any configured shared pattern
    const headerNames = headers.map(h => h.originalName).sort();
    
    for (const [className, configHeaders] of Object.entries(this.sharedHeaderConfig)) {
      const sortedConfigHeaders = [...configHeaders].sort();
      if (this.arraysEqual(headerNames, sortedConfigHeaders)) {
        // Mark this shared model as used
        this.usedSharedModels.add(className);
        
        // Store the model definition if we haven't seen it yet
        if (!this.headerModels.has(className)) {
          this.headerModels.set(className, {
            className,
            fileName: TypeMapper.toSnakeCase(className) + '.f',
            headers,
            isShared: true
          });
        }
        
        return className;
      }
    }

    // No matching shared config, return unique model name
    const uniqueClassName = TypeMapper.toDartClassName(methodName + 'Headers');
    
    // Store this unique model
    if (!this.headerModels.has(uniqueClassName)) {
      this.headerModels.set(uniqueClassName, {
        className: uniqueClassName,
        fileName: TypeMapper.toSnakeCase(uniqueClassName) + '.f',
        headers,
        isShared: false
      });
    }
    
    return uniqueClassName;
  }

  /**
   * Generate header model file for a specific endpoint (non-shared)
   */
  generateHeaderModel(methodName: string, headers: HeaderParameter[]): GeneratedFile | null {
    if (headers.length === 0) {
      return null;
    }

    // Check if this should use a shared model
    const headerNames = headers.map(h => h.originalName).sort();
    for (const [className, configHeaders] of Object.entries(this.sharedHeaderConfig)) {
      const sortedConfigHeaders = [...configHeaders].sort();
      if (this.arraysEqual(headerNames, sortedConfigHeaders)) {
        // This uses a shared model, don't generate individual file
        return null;
      }
    }

    // Generate unique model file
    const className = TypeMapper.toDartClassName(methodName + 'Headers');
    const fileName = TypeMapper.toSnakeCase(className) + '.f';
    
    const properties = headers.map(header => ({
      name: header.dartName,
      type: header.type || 'String',
      required: header.required,
      description: header.description,
      jsonKey: header.dartName !== header.originalName ? header.originalName : undefined
    }));

    const content = this.templateManager.render('freezed-model', {
      className,
      fileName,
      isEnum: false,
      properties,
      hasJsonKey: properties.some(p => p.jsonKey),
      hasDescription: properties.some(p => p.description)
    });

    return {
      path: `models/headers/${fileName}.dart`,
      content
    };
  }

  /**
   * Generate all shared header model files
   */
  generateSharedHeaderFiles(): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    
    // Only generate files for shared models that are actually used
    for (const className of this.usedSharedModels) {
      const model = this.headerModels.get(className);
      if (!model) continue;

      const properties = model.headers.map(header => ({
        name: header.dartName,
        type: header.type || 'String',
        required: header.required,
        description: header.description,
        jsonKey: header.dartName !== header.originalName ? header.originalName : undefined
      }));

      const content = this.templateManager.render('freezed-model', {
        className: model.className,
        fileName: model.fileName,
        isEnum: false,
        properties,
        hasJsonKey: properties.some(p => p.jsonKey),
        hasDescription: properties.some(p => p.description)
      });

      files.push({
        path: `models/headers/${model.fileName}.dart`,
        content
      });
    }

    return files;
  }

  /**
   * Check if this is a shared header model
   */
  isSharedModel(className: string): boolean {
    return this.usedSharedModels.has(className);
  }

  /**
   * Helper to compare arrays
   */
  private arraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  /**
   * Clear all models (for testing)
   */
  clear(): void {
    this.headerModels.clear();
    this.usedSharedModels.clear();
  }
}

interface SharedHeaderModel {
  className: string;
  fileName: string;
  headers: HeaderParameter[];
  isShared: boolean;
}