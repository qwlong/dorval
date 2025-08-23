import {
  ClientBuilder,
  ClientGeneratorBuilder,
  ClientHeaderBuilder,
  ClientDependenciesBuilder,
  ClientFooterBuilder,
  GeneratorVerbOptions,
  GeneratorOptions,
  GeneratorDependency,
} from '@dorval/core';

/**
 * Generate custom client implementation for a service method
 * This follows the Orval mutator pattern
 */
const generateCustomImplementation = (
  {
    verb,
    route,
    operationName,
    response,
    body,
    headers,
    queryParams,
    pathParams,
    props,
    mutator,
    override,
  }: GeneratorVerbOptions,
  { output }: GeneratorOptions,
): string => {
  const httpMethod = verb.toUpperCase();
  const hasBody = ['POST', 'PUT', 'PATCH'].includes(httpMethod) && body;
  const hasQueryParams = !!queryParams;
  const hasHeaders = !!headers;
  const hasPathParams = pathParams && pathParams.length > 0;
  
  // Get mutator config
  const mutatorPath = mutator?.path || output.override?.mutator?.path;
  const mutatorName = mutator?.name || output.override?.mutator?.name || 'customClient';
  
  // Build path with parameters
  let pathConstruction = hasPathParams
    ? `final path = '${route}'${pathParams.map((p: any) => `.replaceAll('{${p.name}}', ${p.dartName}.toString())`).join('')};`
    : `const path = '${route}';`;
  
  // Build query parameters
  let queryParamsConstruction = '';
  if (hasQueryParams) {
    queryParamsConstruction = `
    final params = <String, dynamic>{
      ${queryParams.map((q: any) => `if (${q.dartName} != null) '${q.name}': ${q.dartName},`).join('\n      ')}
    };`;
  }
  
  // Build headers
  let headersConstruction = '';
  if (hasHeaders) {
    headersConstruction = `
    final headers = <String, String>{
      ${headers.map((h: any) => `if (${h.dartName} != null) '${h.name}': ${h.dartName}.toString(),`).join('\n      ')}
    };`;
  }
  
  // Build data
  let dataConstruction = '';
  if (hasBody) {
    dataConstruction = `
    final data = ${body.dartName}${body.isModel ? '.toJson()' : ''};`;
  }
  
  // Build mutator call
  let mutatorCall = `await ${mutatorName}<${response.dartType}>(
      RequestConfig(
        path: path,
        method: '${httpMethod}',`;
  
  if (hasQueryParams) {
    mutatorCall += `
        params: params,`;
  }
  
  if (hasHeaders) {
    mutatorCall += `
        headers: headers,`;
  }
  
  if (hasBody) {
    mutatorCall += `
        data: data,`;
  }
  
  mutatorCall += `
      ),
    )`;
  
  // Build response handling
  let responseHandling = '';
  if (response.isVoid) {
    responseHandling = 'return;';
  } else if (response.isList) {
    responseHandling = `
    return (response as List<dynamic>)
        .map((item) => ${response.itemType}.fromJson(item as Map<String, dynamic>))
        .toList();`;
  } else if (response.isModel) {
    responseHandling = `
    return ${response.type}.fromJson(response as Map<String, dynamic>);`;
  } else if (response.isPrimitive) {
    responseHandling = `
    return response as ${response.type};`;
  } else {
    responseHandling = `
    return response;`;
  }
  
  // Build complete implementation
  return `
  Future<${response.dartType}> ${operationName}(${props.map((p: any) => `${p.type} ${p.name}`).join(', ')}) async {
    ${pathConstruction}
    ${queryParamsConstruction}
    ${headersConstruction}
    ${dataConstruction}
    
    try {
      final response = ${mutatorCall};
      ${responseHandling}
    } catch (e) {
      throw ApiException(
        message: e.toString(),
        error: e,
      );
    }
  }`;
};

/**
 * Generate custom client builder
 */
export const generateCustomClient: ClientBuilder = (
  verbOptions: GeneratorVerbOptions,
  options: GeneratorOptions,
) => {
  const implementation = generateCustomImplementation(verbOptions, options);
  
  const mutatorPath = verbOptions.mutator?.path || options.output.override?.mutator?.path;
  const mutatorName = verbOptions.mutator?.name || options.output.override?.mutator?.name || 'customClient';
  
  const imports = [
    `import '${mutatorPath}';`, // Import the custom client
    "import '../api_exception.dart';",
    "import '../request_config.dart';", // Request config for custom client
  ];
  
  // Add model imports if needed
  if (verbOptions.response?.isModel) {
    imports.push(`import '../models/${verbOptions.response.fileName}.dart';`);
  }
  
  if (verbOptions.body?.isModel) {
    imports.push(`import '../models/${verbOptions.body.fileName}.dart';`);
  }
  
  return { implementation, imports };
};

/**
 * Generate custom client header
 */
export const generateCustomHeader: ClientHeaderBuilder = ({ title, isMutator }) => {
  return `
/// ${title ? `${title} - ` : ''}Generated service using custom client
/// This service uses a custom HTTP client implementation
${isMutator ? '/// The custom client is provided via mutator configuration' : ''}
`;
};

/**
 * Get custom client dependencies
 */
export const getCustomDependencies: ClientDependenciesBuilder = () => {
  // Custom client doesn't have specific package dependencies
  // The user provides their own implementation
  return [];
};

/**
 * Generate custom client footer
 */
export const generateCustomFooter: ClientFooterBuilder = () => {
  return ''; // No special footer needed
};

/**
 * Custom client builder configuration
 */
const customClientBuilder: ClientGeneratorBuilder = {
  client: generateCustomClient,
  header: generateCustomHeader,
  dependencies: getCustomDependencies,
  footer: generateCustomFooter,
};

/**
 * Builder factory function (following Orval pattern)
 */
export const builder = () => () => customClientBuilder;

export default builder;