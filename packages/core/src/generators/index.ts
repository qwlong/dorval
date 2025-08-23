/**
 * Main generator orchestrator
 */

import { DartGeneratorOptions, GeneratedFile } from '../types';
import { parseOpenAPISpec } from '../parser';
import { generateModels } from './models';
import { generateClient } from './client';
import { generateServices } from './services';
import { writeToDisk } from '../utils/file';

export async function generateDartCode(options: DartGeneratorOptions): Promise<GeneratedFile[]> {
  // Parse OpenAPI specification
  const spec = await parseOpenAPISpec(options.input);
  
  const files: GeneratedFile[] = [];
  
  // Generate models
  const models = await generateModels(spec, options);
  files.push(...models);
  
  // Generate API client
  const client = await generateClient(spec, options);
  files.push(...client);
  
  // Generate services - create a deep copy to preserve $refs
  const freshSpec = typeof options.input === 'object' 
    ? JSON.parse(JSON.stringify(options.input)) 
    : await parseOpenAPISpec(options.input);
  const services = await generateServices(freshSpec, options);
  files.push(...services);
  
  // Write files to disk
  if (options.output.target) {
    await writeToDisk(files, options.output.target);
  }
  
  return files;
}

export { generateModels } from './models';
export { generateClient } from './client';
export { generateServices } from './services';

// Export internal classes for advanced usage
export { ModelGenerator } from './model-generator';
export { ServiceGenerator } from './service-generator';
export { EndpointGenerator } from './endpoint-generator';