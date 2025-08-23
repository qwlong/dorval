/**
 * Template manager for loading and compiling Handlebars templates
 */

import Handlebars from 'handlebars';
import * as fs from 'fs-extra';
import * as path from 'path';

export class TemplateManager {
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();
  private handlebars: typeof Handlebars;

  constructor() {
    this.handlebars = Handlebars.create();
    this.registerHelpers();
  }

  /**
   * Register custom Handlebars helpers
   */
  private registerHelpers(): void {
    // Helper to check if a value is not something
    this.handlebars.registerHelper('not', (value: any) => {
      return !value;
    });

    // Helper for logical OR
    this.handlebars.registerHelper('or', (...args: any[]) => {
      // Remove the last argument (Handlebars options object)
      const values = args.slice(0, -1);
      return values.some(v => v);
    });

    // Helper for logical AND
    this.handlebars.registerHelper('and', (...args: any[]) => {
      // Remove the last argument (Handlebars options object)
      const values = args.slice(0, -1);
      return values.every(v => v);
    });

    // Helper to check equality
    this.handlebars.registerHelper('eq', (a: any, b: any) => {
      return a === b;
    });

    // Helper to check inequality
    this.handlebars.registerHelper('neq', (a: any, b: any) => {
      return a !== b;
    });

    // Helper to format Dart documentation comments
    this.handlebars.registerHelper('dartDoc', (text: string, options?: any) => {
      if (!text) return '';
      
      // Check if indentLevel is passed as a hash parameter
      const indentLevel = options?.hash?.indent ?? 2;
      const indentStr = ' '.repeat(indentLevel);
      
      // Split by newlines
      const lines = text.split('\n');
      
      // Filter out empty lines at the beginning and end
      while (lines.length > 0 && lines[0].trim() === '') {
        lines.shift();
      }
      while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
        lines.pop();
      }
      
      // Format each line with /// prefix, all with same indentation
      const formattedLines = lines.map((line) => {
        const trimmed = line.trim();
        return trimmed ? `${indentStr}/// ${trimmed}` : `${indentStr}///`;
      });
      
      return formattedLines.join('\n');
    });

    // Helper to convert to camelCase
    this.handlebars.registerHelper('camelCase', (str: string) => {
      return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    });

    // Helper to convert to PascalCase
    this.handlebars.registerHelper('pascalCase', (str: string) => {
      const camel = str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      return camel.charAt(0).toUpperCase() + camel.slice(1);
    });

    // Helper to convert to snake_case
    this.handlebars.registerHelper('snakeCase', (str: string) => {
      return str
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '');
    });

    // Helper to add indentation
    this.handlebars.registerHelper('indent', (text: string, spaces: number) => {
      const indent = ' '.repeat(spaces);
      return text.split('\n').map(line => indent + line).join('\n');
    });

    // Helper to join array with separator
    this.handlebars.registerHelper('join', (array: any[], separator: string) => {
      if (!Array.isArray(array)) return '';
      return array.join(separator);
    });
  }

  /**
   * Load and compile a template
   */
  async loadTemplate(templateName: string): Promise<HandlebarsTemplateDelegate> {
    // Check cache first
    if (this.templates.has(templateName)) {
      return this.templates.get(templateName)!;
    }

    // Load template file - check both templates dir and direct path
    let templatePath = path.join(__dirname, 'templates', `${templateName}.hbs`);
    if (!fs.existsSync(templatePath)) {
      templatePath = path.join(__dirname, `${templateName}.hbs`);
    }
    const templateContent = await fs.readFile(templatePath, 'utf-8');

    // Compile template
    const compiled = this.handlebars.compile(templateContent, {
      noEscape: false,
      strict: false
    });

    // Cache for future use
    this.templates.set(templateName, compiled);

    return compiled;
  }

  /**
   * Load template synchronously
   */
  loadTemplateSync(templateName: string): HandlebarsTemplateDelegate {
    // Check cache first
    if (this.templates.has(templateName)) {
      return this.templates.get(templateName)!;
    }

    // Load template file - check both templates dir and direct path
    let templatePath = path.join(__dirname, 'templates', `${templateName}.hbs`);
    if (!fs.existsSync(templatePath)) {
      templatePath = path.join(__dirname, `${templateName}.hbs`);
    }
    const templateContent = fs.readFileSync(templatePath, 'utf-8');

    // Compile template
    const compiled = this.handlebars.compile(templateContent, {
      noEscape: false,
      strict: false
    });

    // Cache for future use
    this.templates.set(templateName, compiled);

    return compiled;
  }

  /**
   * Render a template with data
   */
  render(templateName: string, data: any): string {
    const template = this.loadTemplateSync(templateName);
    return template(data);
  }

  /**
   * Register a partial template
   */
  registerPartial(name: string, content: string): void {
    this.handlebars.registerPartial(name, content);
  }

  /**
   * Clear template cache
   */
  clearCache(): void {
    this.templates.clear();
  }
}