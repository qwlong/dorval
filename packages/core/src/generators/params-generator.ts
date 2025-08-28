/**
 * Generate Dart parameter models using Freezed
 */

import { GeneratedFile } from '../types';
import { TypeMapper } from '../utils/type-mapper';
import { TemplateManager } from '../templates/template-manager';
import { QueryParameter, HeaderParameter } from './endpoint-generator';

export interface ParameterModel {
  className: string;
  fileName: string;
  description?: string;
  properties: ParameterProperty[];
  imports?: string[];
}

export interface ParameterProperty {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  jsonKey?: string; // Original name if different from dart name
}

export class ParamsGenerator {
  private templateManager: TemplateManager;

  constructor() {
    this.templateManager = new TemplateManager();
  }

  /**
   * Generate a query parameters model
   */
  generateQueryParamsModel(
    methodName: string,
    queryParams: QueryParameter[]
  ): GeneratedFile | null {
    if (queryParams.length === 0) {
      return null;
    }

    const className = TypeMapper.toDartClassName(methodName + 'Params');
    const fileName = TypeMapper.toSnakeCase(className) + '.f';
    
    // Collect imports from parameter types
    const imports = new Set<string>();
    
    const properties: ParameterProperty[] = queryParams.map(param => {
      // Check if the dartName was escaped (ends with underscore due to keyword)
      const needsJsonKey = param.dartName !== param.originalName || 
                           param.dartName.endsWith('_');
      
      // Check if the type needs an import (custom model types)
      const paramType = param.type || 'String';
      if (!this.isBuiltInType(paramType)) {
        // Extract base type from List<Type> or Map<K,V>
        const baseType = this.extractBaseType(paramType);
        if (!this.isBuiltInType(baseType)) {
          const fileName = TypeMapper.toSnakeCase(baseType) + '.f.dart';
          imports.add(fileName);
        }
      }
      
      return {
        name: param.dartName,
        type: paramType,
        required: param.required,
        description: param.description,
        jsonKey: needsJsonKey ? param.originalName : undefined
      };
    });

    const model: ParameterModel = {
      className,
      fileName,
      description: `Query parameters for ${methodName}`,
      properties,
      imports: Array.from(imports)
    };

    const content = this.renderParamsModel(model);
    
    return {
      path: `models/params/${fileName}.dart`,
      content
    };
  }

  /**
   * Generate a headers model
   */
  generateHeadersModel(
    methodName: string,
    headers: HeaderParameter[]
  ): GeneratedFile | null {
    // Don't filter headers - if they're defined in OpenAPI, they should be included
    // The OpenAPI spec author knows what headers are needed
    if (headers.length === 0) {
      return null;
    }

    const className = TypeMapper.toDartClassName(methodName + 'Headers');
    const fileName = TypeMapper.toSnakeCase(className) + '.f';
    
    // Collect imports from header types
    const imports = new Set<string>();
    
    const properties: ParameterProperty[] = headers.map(header => {
      const headerType = header.type || 'String';
      
      // Check if the type needs an import
      if (!this.isBuiltInType(headerType)) {
        const baseType = this.extractBaseType(headerType);
        if (!this.isBuiltInType(baseType)) {
          const fileName = TypeMapper.toSnakeCase(baseType) + '.f.dart';
          imports.add(fileName);
        }
      }
      
      return {
        name: header.dartName,
        type: headerType,
        required: header.required,
        description: header.description,
        jsonKey: header.dartName !== header.originalName ? header.originalName : undefined
      };
    });

    const model: ParameterModel = {
      className,
      fileName,
      description: `Headers for ${methodName}`,
      properties,
      imports: Array.from(imports)
    };

    const content = this.renderParamsModel(model);
    
    return {
      path: `models/headers/${fileName}.dart`,
      content
    };
  }

  /**
   * Render a parameter model using the template
   */
  private renderParamsModel(model: ParameterModel): string {
    // Use the template manager to get access to the dartDoc helper
    const template = this.templateManager.loadTemplateSync('params-model');
    return template(model);
  }
  
  /**
   * Check if a type is a built-in Dart type
   */
  private isBuiltInType(type: string): boolean {
    const builtInTypes = [
      'String', 'int', 'double', 'bool', 'num', 'dynamic', 'void',
      'DateTime', 'Uint8List', 'Object', 'Map', 'List', 'Set'
    ];
    
    // Check if it's a generic type like List<X> or Map<X,Y>
    if (type.includes('<')) {
      const baseType = type.substring(0, type.indexOf('<'));
      return builtInTypes.includes(baseType);
    }
    
    return builtInTypes.includes(type);
  }
  
  /**
   * Extract base type from generic types like List<Type> or Map<K,V>
   */
  private extractBaseType(type: string): string {
    // Handle List<Type>
    const listMatch = type.match(/^List<(.+)>$/);
    if (listMatch) {
      return listMatch[1];
    }
    
    // Handle Map<K,V> - we don't need to import for Map
    if (type.startsWith('Map<')) {
      return 'Map';
    }
    
    // Handle nullable types
    if (type.endsWith('?')) {
      return type.slice(0, -1);
    }
    
    return type;
  }
}