/**
 * Main generator orchestrator
 */

import { DartGeneratorOptions, GeneratedFile } from '../types';
import { parseOpenAPISpec } from '../parser';
import { generateModels } from './models';
import { generateClient } from './client';
import { generateServices } from './services';
import { ProvidersGenerator } from './providers-generator';
import { writeToDisk } from '../utils';

export async function generateDartCode(options: DartGeneratorOptions): Promise<GeneratedFile[]> {
  // Parse OpenAPI specification
  const spec = await parseOpenAPISpec(options.input);

  const files: GeneratedFile[] = [];

  // Check if we're generating providers
  if (options.output.mode === 'providers') {
    // Generate models first (providers depend on them)
    const models = await generateModels(spec, options);
    files.push(...models);

    // Generate API client
    const client = await generateClient(spec, options);
    files.push(...client);

    // Generate services
    const freshSpec = typeof options.input === 'object'
      ? JSON.parse(JSON.stringify(options.input))
      : await parseOpenAPISpec(options.input);
    const services = await generateServices(freshSpec, options);
    files.push(...services);

    // Generate Riverpod providers
    const generator = new ProvidersGenerator(options.output.override?.providers);
    const providers = generator.generateProviders(spec, services as any);
    files.push(...providers);
  } else {
    // Standard generation (models + client + services)
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
  }

  // Update models/index.dart to include params and headers exports if they exist
  const modelsIndexFile = files.find(f => f.path === 'models/index.dart');
  if (modelsIndexFile) {
    const hasParams = files.some(f => f.path.startsWith('models/params/') && f.path !== 'models/params/index.dart');
    const hasHeaders = files.some(f => f.path.startsWith('models/headers/') && f.path !== 'models/headers/index.dart');

    if (hasParams || hasHeaders) {
      let additionalExports = '\n\n// Export params and headers if they exist';
      if (hasParams) {
        additionalExports += "\nexport 'params/index.dart';";
      }
      if (hasHeaders) {
        additionalExports += "\nexport 'headers/index.dart';";
      }
      modelsIndexFile.content = modelsIndexFile.content.trimEnd() + additionalExports + '\n';
    }
  }

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
export { ProvidersGenerator } from './providers-generator';