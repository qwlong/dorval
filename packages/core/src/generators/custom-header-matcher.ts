/**
 * Custom header matcher - intelligently matches endpoints to header definitions
 */

import { HeaderParameter } from './endpoint-generator';

export interface HeaderDefinition {
  fields: string[] | { [fieldName: string]: any };
  required?: string[];
  description?: string;
}

export interface CustomMatchConfig {
  definitions: { [className: string]: HeaderDefinition };
  customMatch?: boolean;
  matchStrategy?: 'exact' | 'subset' | 'fuzzy';
}

export class CustomHeaderMatcher {
  private config: CustomMatchConfig;
  private matchCache: Map<string, string | null> = new Map();
  
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
    // If custom matching is disabled or no headers, return null
    if (this.config.customMatch === false || headers.length === 0) {
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
    
    // Cache the result (even if null)
    this.matchCache.set(signature, matchedClass);
    
    return matchedClass;
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
   * Get statistics about header matching
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
   * Generate report of header usage
   */
  generateReport(): string {
    const stats = this.getMatchingStats();
    let report = '# Header Matching Report\n\n';
    
    report += `## Statistics\n`;
    report += `- Total endpoints analyzed: ${stats.totalEndpoints}\n`;
    report += `- Endpoints matched to definitions: ${stats.matchedEndpoints}\n`;
    report += `- Unmatched endpoints: ${stats.unmatchedEndpoints}\n\n`;
    
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
    
    return report;
  }
}