/**
 * Headers generator - handles generation of header models for API endpoints
 */

import { GeneratedFile } from '../types';
import { TypeMapper } from '../utils';
import { TemplateManager } from '../templates/template-manager';
import { HeaderParameter } from './endpoint-generator';

export interface HeaderDefinition {
  fields: string[] | { [fieldName: string]: any };
  required?: string[];
  description?: string;
}

export interface HeadersConfig {
  definitions?: { [className: string]: HeaderDefinition };
  matchStrategy?: 'exact' | 'subset' | 'fuzzy';
}

export class HeadersGenerator {
  private templateManager: TemplateManager;
  private config?: HeadersConfig;
  private matchCache: Map<string, string | null> = new Map();
  
  constructor(config?: HeadersConfig) {
    this.templateManager = new TemplateManager();
    this.config = config;
  }
  
  /**
   * Generate a headers model for an endpoint
   */
  generateHeadersModel(
    methodName: string,
    headers: HeaderParameter[]
  ): GeneratedFile | null {
    if (headers.length === 0) {
      return null;
    }

    const className = TypeMapper.toDartClassName(methodName + 'Headers');
    const fileName = TypeMapper.toSnakeCase(className);
    
    const properties = headers.map(header => ({
      name: header.dartName,
      type: header.type || 'String',
      required: header.required,
      description: header.description,
      jsonKey: header.dartName !== header.originalName ? header.originalName : undefined
    }));

    const content = this.templateManager.render('freezed-headers-model', {
      className,
      fileName,
      description: `Headers for ${methodName}`,
      properties,
      hasJsonKey: properties.some(p => p.jsonKey),
      hasDescription: properties.some(p => p.description)
    });
    
    return {
      path: `models/headers/${fileName}.f.dart`,
      content
    };
  }
  
  /**
   * Find the best matching header class from configuration
   */
  findMatchingHeaderClass(endpoint: string, headers: HeaderParameter[]): string | null {
    if (!this.config?.definitions || headers.length === 0) {
      return null;
    }
    
    // Create signature for caching
    const signature = this.createHeaderSignature(headers);
    
    // Check cache first
    if (this.matchCache.has(signature)) {
      return this.matchCache.get(signature)!;
    }
    
    // Try to find matching definition
    const matchedClass = this.findBestMatch(headers);
    
    // Cache the result
    this.matchCache.set(signature, matchedClass);
    
    return matchedClass;
  }
  
  /**
   * Generate consolidated header files from configuration
   */
  generateConfiguredHeaderFiles(): GeneratedFile[] {
    if (!this.config?.definitions) {
      return [];
    }
    
    const files: GeneratedFile[] = [];
    const generatedSignatures = new Set<string>();
    
    Object.entries(this.config.definitions).forEach(([className, definition]) => {
      const fields = this.parseHeaderFields(definition);
      
      // Create signature to avoid duplicates
      const signature = fields
        .map(f => `${f.name}:${f.required ? 'R' : 'O'}`)
        .sort()
        .join('|');
      
      if (!generatedSignatures.has(signature)) {
        generatedSignatures.add(signature);
        
        const headersClassName = className.endsWith('Headers') ? className : className + 'Headers';
        const fileName = TypeMapper.toSnakeCase(className);
        
        const properties = fields.map(f => ({
          name: TypeMapper.toCamelCase(f.name.replace(/-/g, '_')),
          type: f.type || 'String',
          required: f.required,
          description: f.description || '',
          jsonKey: f.name
        }));
        
        const content = this.templateManager.render('freezed-headers-model', {
          className: headersClassName,
          fileName,
          description: definition.description,
          properties,
          hasJsonKey: true,
          hasDescription: properties.some(p => p.description)
        });
        
        files.push({
          path: `models/headers/${fileName}.f.dart`,
          content
        });
      }
    });
    
    return files;
  }
  
  /**
   * Get matching statistics
   */
  getMatchingStats(): {
    totalEndpoints: number;
    matchedEndpoints: number;
    unmatchedEndpoints: number;
  } {
    const matchedEndpoints = Array.from(this.matchCache.values()).filter(v => v !== null).length;
    const totalEndpoints = this.matchCache.size;
    
    return {
      totalEndpoints,
      matchedEndpoints,
      unmatchedEndpoints: totalEndpoints - matchedEndpoints
    };
  }
  
  /**
   * Generate matching report
   */
  generateReport(): string {
    const stats = this.getMatchingStats();
    let report = '# Header Matching Report\n\n';
    
    report += `## Statistics\n`;
    report += `- Total endpoints analyzed: ${stats.totalEndpoints}\n`;
    report += `- Endpoints matched to definitions: ${stats.matchedEndpoints}\n`;
    report += `- Unmatched endpoints: ${stats.unmatchedEndpoints}\n\n`;
    
    if (this.config?.definitions) {
      report += `## Header Class Usage\n`;
      const classUsage = new Map<string, number>();
      
      for (const className of this.matchCache.values()) {
        if (className) {
          classUsage.set(className, (classUsage.get(className) || 0) + 1);
        }
      }
      
      for (const [className, count] of classUsage.entries()) {
        report += `- ${className}: ${count} endpoints\n`;
      }
    }
    
    return report;
  }
  
  /**
   * Parse header fields from definition
   */
  private parseHeaderFields(definition: HeaderDefinition): Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }> {
    if (Array.isArray(definition.fields)) {
      return definition.fields.map(name => ({
        name,
        type: 'String',
        required: definition.required?.includes(name) ?? true,
        description: undefined
      }));
    } else {
      return Object.entries(definition.fields).map(([name, info]) => ({
        name,
        type: typeof info === 'object' && info !== null && 'type' in info ? 
          (info as any).type : 'String',
        required: typeof info === 'object' && info !== null && 'required' in info ? 
          (info as any).required : (definition.required?.includes(name) ?? true),
        description: typeof info === 'object' && info !== null && 'description' in info ?
          (info as any).description : undefined
      }));
    }
  }
  
  /**
   * Find the best matching header definition
   */
  private findBestMatch(headers: HeaderParameter[]): string | null {
    if (!this.config?.definitions) {
      return null;
    }
    
    const strategy = this.config.matchStrategy || 'exact';
    const headerNames = headers.map(h => h.originalName).sort();
    const requiredHeaders = headers.filter(h => h.required).map(h => h.originalName).sort();
    
    let bestMatch: { className: string; score: number } | null = null;
    
    for (const [className, definition] of Object.entries(this.config.definitions)) {
      const defFields = this.getFieldNames(definition);
      const defRequired = definition.required || defFields;
      
      if (strategy === 'exact') {
        // Exact match: same fields and same required status
        if (this.arraysEqual(headerNames, defFields) &&
            this.arraysEqual(requiredHeaders, [...defRequired].sort())) {
          return className;
        }
      } else if (strategy === 'subset') {
        // Subset match: endpoint headers are subset of definition
        if (this.isSubset(headerNames, defFields)) {
          const score = this.calculateMatchScore(headers, definition);
          if (!bestMatch || score > bestMatch.score) {
            bestMatch = { className, score };
          }
        }
      } else if (strategy === 'fuzzy') {
        // Fuzzy match: find best overlap
        const score = this.calculateFuzzyScore(headers, definition);
        if (score > 0 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { className, score };
        }
      }
    }
    
    return bestMatch?.className || null;
  }
  
  /**
   * Calculate match score for subset matching
   */
  private calculateMatchScore(
    headers: HeaderParameter[],
    definition: HeaderDefinition
  ): number {
    let score = 0;
    const defFields = this.getFieldNames(definition);
    const defRequired = definition.required || defFields;
    
    headers.forEach(header => {
      if (defFields.includes(header.originalName)) {
        score += 1;
        // Bonus points if required status matches
        const shouldBeRequired = defRequired.includes(header.originalName);
        if (header.required === shouldBeRequired) {
          score += 0.5;
        }
      }
    });
    
    // Penalty for extra fields in definition
    const extraFields = defFields.length - headers.length;
    score -= extraFields * 0.25;
    
    return score;
  }
  
  /**
   * Calculate fuzzy match score
   */
  private calculateFuzzyScore(
    headers: HeaderParameter[],
    definition: HeaderDefinition
  ): number {
    const headerNames = headers.map(h => h.originalName);
    const defFields = this.getFieldNames(definition);
    
    // Calculate Jaccard similarity
    const intersection = headerNames.filter(h => defFields.includes(h));
    const union = new Set([...headerNames, ...defFields]);
    
    if (union.size === 0) return 0;
    
    return intersection.length / union.size;
  }
  
  /**
   * Create a signature for headers (for caching)
   */
  private createHeaderSignature(headers: HeaderParameter[]): string {
    return headers
      .map(h => `${h.originalName}:${h.required ? 'R' : 'O'}`)
      .sort()
      .join('|');
  }
  
  /**
   * Get field names from definition (sorted)
   */
  private getFieldNames(definition: HeaderDefinition): string[] {
    if (Array.isArray(definition.fields)) {
      return [...definition.fields].sort();
    }
    return Object.keys(definition.fields).sort();
  }
  
  /**
   * Check if two arrays are equal
   */
  private arraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
  
  /**
   * Check if array a is subset of array b
   */
  private isSubset(a: string[], b: string[]): boolean {
    return a.every(item => b.includes(item));
  }
}