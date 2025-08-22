/**
 * Generate API service classes
 */

import { OpenAPIObject } from '../types';
import { DartGeneratorOptions, GeneratedFile } from '../types';
import { ServiceGenerator } from './service-generator';

export async function generateServices(
  spec: OpenAPIObject,
  options: DartGeneratorOptions
): Promise<GeneratedFile[]> {
  const generator = new ServiceGenerator();
  return generator.generateServices(spec, options);
}