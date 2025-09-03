/**
 * Dart model generator using Freezed
 */

import type { OpenAPIV3 } from 'openapi-types';
import { DartModel, DartProperty, GeneratedFile } from '../types';
import { TypeMapper } from '../utils/type-mapper';
import { ReferenceResolver } from '../resolvers/reference-resolver';
import { TemplateManager } from '../templates/template-manager';

export class ModelGenerator {
  private templateManager: TemplateManager;
  private refResolver?: ReferenceResolver;
  private debugCount: number = 0;

  constructor() {
    this.templateManager = new TemplateManager();
  }
  
  /**
   * Set the reference resolver for this generator
   */
  setReferenceResolver(refResolver: ReferenceResolver): void {
    this.refResolver = refResolver;
  }

  /**
   * Generate a Freezed model from OpenAPI schema
   */
  generateModel(name: string, schema: OpenAPIV3.SchemaObject): GeneratedFile {
    const dartModel = this.schemaToModel(name, schema);
    const content = this.renderModel(dartModel);
    
    return {
      path: `models/${TypeMapper.toSnakeCase(name)}.f.dart`,
      content
    };
  }

  /**
   * Convert OpenAPI schema to DartModel
   */
  private schemaToModel(name: string, schema: OpenAPIV3.SchemaObject): DartModel {
    const properties: DartProperty[] = [];
    const imports: Set<string> = new Set();
    
    // Handle allOf composition - merge all schemas
    let mergedProperties: Record<string, any> = {};
    let mergedRequired: string[] = [];
    
    if (schema.allOf) {
      for (const subSchema of schema.allOf) {
        let resolved: OpenAPIV3.SchemaObject;
        
        // Resolve references in allOf
        if ('$ref' in subSchema && this.refResolver) {
          resolved = this.refResolver.resolveReference(subSchema.$ref) as OpenAPIV3.SchemaObject;
        } else {
          resolved = subSchema as OpenAPIV3.SchemaObject;
        }
        
        if (resolved && resolved.properties) {
          mergedProperties = { ...mergedProperties, ...resolved.properties };
        }
        
        if (resolved && resolved.required) {
          mergedRequired = [...mergedRequired, ...resolved.required];
        }
      }
    }
    
    // Use merged properties if we had allOf, otherwise use schema.properties
    const finalProperties = Object.keys(mergedProperties).length > 0 ? mergedProperties : (schema.properties || {});
    const finalRequired = mergedRequired.length > 0 ? [...new Set(mergedRequired)] : (schema.required || []);
    
    // Process properties
    if (finalProperties && Object.keys(finalProperties).length > 0) {
      const requiredFields = new Set(finalRequired);
      
      Object.entries(finalProperties).forEach(([propName, propSchema]) => {
        const dartName = TypeMapper.toDartPropertyName(propName);
        const isRequired = requiredFields.has(propName);
        
        // Use ReferenceResolver to handle both direct references and regular schemas
        let dartType: string;
        if (this.refResolver) {
          const resolved = this.refResolver.resolvePropertyType(propSchema, isRequired);
          dartType = resolved.type;  // ReferenceResolver already handles nullable
          resolved.imports.forEach(imp => imports.add(imp));
        } else if ('$ref' in propSchema) {
          // Handle reference without ReferenceResolver
          const modelName = TypeMapper.extractTypeFromRef(propSchema.$ref);
          const baseType = TypeMapper.toDartClassName(modelName);
          const fileName = TypeMapper.toSnakeCase(modelName);
          imports.add(`${fileName}.f.dart`);
          
          // Check if needs nullable for references
          const propDetails = {} as OpenAPIV3.SchemaObject;
          const hasDefault = propDetails.default !== undefined;
          const needsNullable = !isRequired && !hasDefault;
          dartType = needsNullable && !baseType.endsWith('?') ? `${baseType}?` : baseType;
        } else {
          const prop = propSchema as OpenAPIV3.SchemaObject;
          
          // Check if this property uses nullable patterns
          const isNullable = TypeMapper.isNullable(prop);
          const baseSchema = TypeMapper.getBaseTypeFromNullable(prop);
          const baseType = TypeMapper.mapType(baseSchema);
          const typeImports = TypeMapper.getImportsForType(baseType);
          typeImports.forEach(imp => imports.add(imp));
          
          // Determine if type should be nullable
          const hasDefault = prop.default !== undefined;
          const needsNullable = (!isRequired && !hasDefault) || isNullable;
          dartType = needsNullable && !baseType.endsWith('?') ? `${baseType}?` : baseType;
        }
        
        // Get property details from the schema
        const propDetails = '$ref' in propSchema ? {} : propSchema as OpenAPIV3.SchemaObject;
        
        properties.push({
          name: dartName,
          type: dartType,
          required: isRequired,
          nullable: !isRequired || propDetails.nullable === true,
          description: propDetails.description,
          defaultValue: propDetails.default,
          jsonKey: dartName !== propName ? propName : undefined
        });
      });
    }
    
    return {
      name: TypeMapper.toDartClassName(name),
      properties,
      imports: Array.from(imports),
      description: schema.description,
      isEnum: false
    };
  }

  /**
   * Render a DartModel to Dart code
   */
  private renderModel(model: DartModel): string {
    const fileName = TypeMapper.toSnakeCase(model.name);
    
    // Check for special types
    const hasDateTime = model.properties.some(p => p.type.includes('DateTime'));
    const hasUint8List = model.properties.some(p => p.type.includes('Uint8List'));
    // DateTime converters are not needed - Freezed/json_serializable handle DateTime automatically
    const hasDateTimeConverter = false;
    
    // Check if we need custom JSON serialization
    const hasCustomJson = model.properties.some(p => p.jsonKey);
    const hasFieldRename = false; // We handle field names individually
    
    // Prepare template data
    const templateData = {
      className: model.name,
      fileName,
      description: model.description,
      deprecated: false,
      properties: model.properties.map(prop => ({
        name: prop.name,
        type: prop.type,
        // If a field has a default value, it should not be marked as required in Freezed
        required: prop.required && !prop.defaultValue,
        nullable: prop.nullable,
        description: prop.description,
        jsonKey: prop.jsonKey,
        isDateTime: prop.type === 'DateTime',
        defaultValue: this.formatDefaultValue(prop),
        deprecated: false
      })),
      hasDateTime,
      hasUint8List,
      hasDateTimeConverter,
      hasCustomJson,
      hasFieldRename,
      additionalImports: model.imports.filter(imp => 
        !imp.includes('dart:') && 
        !imp.includes('freezed') && 
        !imp.includes('json_annotation')
      ),
      hasCustomMethods: false,
      customMethods: []
    };
    
    // Debug: Log first few models
    if (this.debugCount === undefined) {
      this.debugCount = 0;
    }
    if (this.debugCount++ < 3) {
      console.log(`DEBUG: Model ${model.name}:`, JSON.stringify({
        className: templateData.className,
        propertiesCount: templateData.properties.length
      }, null, 2));
    }

    return this.templateManager.render('freezed-model', templateData);
  }

  /**
   * Format default value for template
   */
  private formatDefaultValue(prop: DartProperty): string | null {
    if (prop.defaultValue === undefined || prop.defaultValue === null) {
      return null;
    }
    
    // Format based on type
    if (prop.type === 'String') {
      return `'${prop.defaultValue}'`;
    }
    
    if (prop.type === 'int' || prop.type === 'double') {
      return String(prop.defaultValue);
    }
    
    if (prop.type === 'bool') {
      return String(prop.defaultValue);
    }
    
    if (prop.type.startsWith('List')) {
      return 'const []';
    }
    
    if (prop.type.startsWith('Map')) {
      return 'const {}';
    }
    
    return null;
  }

  /**
   * Generate enum from schema
   */
  generateEnum(name: string, values: string[], description?: string): GeneratedFile {
    const enumName = TypeMapper.toDartClassName(name);
    const fileName = TypeMapper.toSnakeCase(enumName);
    
    // Convert enum values to valid Dart enum names
    const enumValues = values.map(value => {
      // Handle null values
      if (value === null || value === 'null') {
        return {
          name: 'nullValue',
          value: 'null',
          description: 'Null value'
        };
      }
      
      // Handle empty string
      if (value === '') {
        return {
          name: 'empty',
          value: '',
          description: 'Empty string'
        };
      }
      
      // Start with the original value
      let dartName = String(value);
      
      // Handle numeric-only values or values starting with numbers
      if (/^\d/.test(dartName)) {
        dartName = `value${dartName.charAt(0).toUpperCase() + dartName.slice(1)}`;
      }
      
      // Replace special characters with underscores
      dartName = dartName
        .replace(/[^a-zA-Z0-9_]/g, '_')  // Replace non-alphanumeric with underscore
        .replace(/_+/g, '_')              // Replace multiple underscores with single
        .replace(/^_+|_+$/g, '');         // Remove leading/trailing underscores
      
      // Convert to camelCase for Dart enum convention
      // Split by underscore and capitalize each part except first
      const parts = dartName.split('_');
      dartName = parts[0].toLowerCase() + parts.slice(1).map(p => 
        p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
      ).join('');
      
      // Ensure it doesn't start with uppercase
      if (dartName.charAt(0).match(/[A-Z]/)) {
        dartName = dartName.charAt(0).toLowerCase() + dartName.slice(1);
      }
      
      return {
        name: dartName,
        value: value,
        description: undefined
      };
    });
    
    const templateData = {
      enumName,
      description,
      values: enumValues
    };
    
    const content = this.templateManager.render('freezed-enum', templateData);
    
    return {
      path: `models/${fileName}.f.dart`,
      content
    };
  }
}