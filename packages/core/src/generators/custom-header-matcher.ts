/**
 * Custom header matcher - intelligently matches endpoints to header definitions
 */

import { HeaderParameter } from './endpoint-generator';
import { TypeMapper } from '../utils/type-mapper';

export interface HeaderDefinition {
  fields: string[] | { [fieldName: string]: any };
  required?: string[];
  description?: string;
}

export interface CustomMatchConfig {
  definitions: { [className: string]: HeaderDefinition };
  autoMatch?: boolean;
  matchStrategy?: 'exact' | 'subset' | 'fuzzy';
  autoConsolidate?: boolean;
  consolidationThreshold?: number;
}

export class CustomHeaderMatcher {
  private config: CustomMatchConfig;
  private headerSignatures: Map<string, string[]> = new Map();
  private matchCache: Map<string, string> = new Map();
  private consolidatedClasses: Map<string, string> = new Map();
  
  constructor(config: CustomMatchConfig) {
    this.config = config;
  }
  
  /**
   * Find the best matching custom header class for an endpoint
   */
  findMatchingHeaderClass(
    endpoint: string,
    headers: HeaderParameter[]
  ): string | null {
    if (!this.config.customMatch || headers.length === 0) {
      return null;
    }
    
    // Create signature for these headers
    const signature = this.createHeaderSignature(headers);
    
    // Check cache first
    if (this.matchCache.has(signature)) {
      return this.matchCache.get(signature)!;
    }
    
    // Try to find matching definition
    const matchedClass = this.findBestMatch(headers);
    
    if (matchedClass) {
      this.matchCache.set(signature, matchedClass);
      return matchedClass;
    }
    
    // No match found - check if we should custom-consolidate
    if (this.config.customConsolidate) {
      return this.checkForConsolidation(signature, headers, endpoint);
    }
    
    return null;
  }
  
  /**
   * Find the best matching header definition
   */
  private findBestMatch(headers: HeaderParameter[]): string | null {
    const strategy = this.config.matchStrategy || 'exact';
    const headerNames = headers.map(h => h.originalName).sort();
    const requiredHeaders = headers.filter(h => h.required).map(h => h.originalName).sort();
    
    let bestMatch: { className: string; score: number } | null = null;
    
    for (const [className, definition] of Object.entries(this.config.definitions)) {
      const defFields = this.getFieldNames(definition);
      const defRequired = definition.required || defFields;
      
      let score = 0;
      
      if (strategy === 'exact') {
        // Exact match: same fields and same required status
        // Note: defFields is already sorted by getFieldNames()
        if (this.arraysEqual(headerNames, defFields) &&
            this.arraysEqual(requiredHeaders, [...defRequired].sort())) {
          return className;  // Perfect match, return immediately
        }
      } else if (strategy === 'subset') {
        // Subset match: endpoint headers are subset of definition
        if (this.isSubset(headerNames, defFields)) {
          score = this.calculateMatchScore(headers, definition);
          if (!bestMatch || score > bestMatch.score) {
            bestMatch = { className, score };
          }
        }
      } else if (strategy === 'fuzzy') {
        // Fuzzy match: find best overlap
        score = this.calculateFuzzyScore(headers, definition);
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
   * Check if headers should be consolidated
   */
  private checkForConsolidation(
    signature: string,
    headers: HeaderParameter[],
    endpoint: string
  ): string | null {
    if (!this.config.customConsolidate) {
      return null;
    }
    
    // Track this signature
    if (!this.headerSignatures.has(signature)) {
      this.headerSignatures.set(signature, []);
    }
    this.headerSignatures.get(signature)!.push(endpoint);
    
    const endpoints = this.headerSignatures.get(signature)!;
    const threshold = this.config.consolidationThreshold || 3;
    
    // If we've seen this signature enough times, create consolidated class
    if (endpoints.length >= threshold) {
      if (!this.consolidatedClasses.has(signature)) {
        const className = this.generateConsolidatedClassName(endpoints, headers);
        this.consolidatedClasses.set(signature, className);
        
        // Add to definitions for future use
        this.config.definitions[className] = {
          fields: headers.map(h => h.originalName),
          required: headers.filter(h => h.required).map(h => h.originalName),
          description: `Custom-consolidated headers for ${endpoints.length} endpoints`
        };
      }
      
      return this.consolidatedClasses.get(signature)!;
    }
    
    return null;
  }
  
  /**
   * Generate name for consolidated header class
   */
  private generateConsolidatedClassName(
    endpoints: string[],
    headers: HeaderParameter[]
  ): string {
    // Try to find common pattern in endpoints
    const commonPrefix = this.findCommonPrefix(endpoints);
    
    if (commonPrefix && commonPrefix.length > 3) {
      // Clean up the prefix and create a meaningful name
      const cleanPrefix = commonPrefix
        .replace(/^\/+/, '')
        .replace(/\/+$/, '')
        .replace(/[^a-zA-Z0-9]/g, ' ')
        .split(' ')
        .filter(p => p.length > 0)
        .map(p => TypeMapper.toPascalCase(p))
        .join('');
      
      if (cleanPrefix) {
        return `${cleanPrefix}Headers`;
      }
    }
    
    // Fallback: use header composition to name it
    const hasApiKey = headers.some(h => h.originalName === 'x-api-key');
    const hasCompany = headers.some(h => h.originalName === 'x-core-company-id' || h.originalName === 'x-company-id');
    const hasStaff = headers.some(h => h.originalName === 'x-company-staff-id');
    const hasMember = headers.some(h => h.originalName === 'x-team-member-id');
    
    let name = '';
    if (hasCompany) name += 'Company';
    if (hasStaff) name += 'Staff';
    if (hasMember) name += 'Member';
    if (name === '') name = 'Common';
    
    // Add suffix to distinguish different required patterns
    const requiredCount = headers.filter(h => h.required).length;
    const totalCount = headers.length;
    
    if (requiredCount === totalCount) {
      // All required - no suffix needed
      return `${name}Headers`;
    } else if (requiredCount === 0) {
      // All optional
      return `${name}OptionalHeaders`;
    } else {
      // Mixed - add a suffix to distinguish
      return `${name}Headers${requiredCount}R${totalCount - requiredCount}O`;
    }
  }
  
  /**
   * Create a signature for headers (for caching and comparison)
   */
  private createHeaderSignature(headers: HeaderParameter[]): string {
    return headers
      .map(h => `${h.originalName}:${h.required ? 'R' : 'O'}`)
      .sort()
      .join('|');
  }
  
  /**
   * Get field names from definition (always sorted for consistent comparison)
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
  
  /**
   * Find common prefix in paths
   */
  private findCommonPrefix(paths: string[]): string {
    if (paths.length === 0) return '';
    if (paths.length === 1) return paths[0];
    
    let prefix = '';
    const firstPath = paths[0];
    
    for (let i = 0; i < firstPath.length; i++) {
      const char = firstPath[i];
      if (paths.every(p => p[i] === char)) {
        prefix += char;
      } else {
        break;
      }
    }
    
    // Clean up to last complete path segment
    const lastSlash = prefix.lastIndexOf('/');
    if (lastSlash > 0) {
      prefix = prefix.substring(0, lastSlash);
    }
    
    return prefix;
  }
  
  /**
   * Get statistics about header matching
   */
  getMatchingStats(): {
    totalEndpoints: number;
    matchedEndpoints: number;
    consolidatedClasses: number;
    unmatchedSignatures: number;
  } {
    let totalEndpoints = 0;
    let matchedEndpoints = 0;
    
    for (const endpoints of this.headerSignatures.values()) {
      totalEndpoints += endpoints.length;
    }
    
    matchedEndpoints = Array.from(this.matchCache.values()).filter(v => v !== null).length;
    
    return {
      totalEndpoints,
      matchedEndpoints,
      consolidatedClasses: this.consolidatedClasses.size,
      unmatchedSignatures: this.headerSignatures.size - this.consolidatedClasses.size
    };
  }
  
  /**
   * Generate report of header usage
   */
  generateReport(): string {
    const stats = this.getMatchingStats();
    let report = '# Header Matching Report\n\n';
    
    report += `## Statistics\n`;
    report += `- Total endpoints analyzed: ${stats.totalEndpoints}\n`;
    report += `- Endpoints matched to definitions: ${stats.matchedEndpoints}\n`;
    report += `- Custom-consolidated classes created: ${stats.consolidatedClasses}\n`;
    report += `- Unmatched signatures: ${stats.unmatchedSignatures}\n\n`;
    
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
    
    if (this.consolidatedClasses.size > 0) {
      report += `\n## Custom-Consolidated Classes\n`;
      for (const [signature, className] of this.consolidatedClasses.entries()) {
        const endpoints = this.headerSignatures.get(signature) || [];
        report += `\n### ${className}\n`;
        report += `Signature: ${signature}\n`;
        report += `Endpoints (${endpoints.length}):\n`;
        endpoints.forEach(ep => {
          report += `- ${ep}\n`;
        });
      }
    }
    
    return report;
  }
}