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
 * Generate enhanced custom client implementation
 * This creates a client with service registration pattern like Supabase/Firebase
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
  const httpMethod = verb.toLowerCase();
  const hasBody = ['post', 'put', 'patch'].includes(httpMethod) && body;
  const hasQueryParams = !!queryParams;
  const hasHeaders = !!headers;
  const hasPathParams = pathParams && pathParams.length > 0;
  
  // Build path with parameters
  let pathConstruction = hasPathParams
    ? `final path = '${route}'${pathParams.map((p: any) => `.replaceAll('{${p.name}}', ${p.dartName}.toString())`).join('')};`
    : `const path = '${route}';`;
  
  // Build query parameters
  let queryParamsConstruction = '';
  if (hasQueryParams) {
    queryParamsConstruction = `
    final queryParameters = <String, dynamic>{
      ${queryParams.map((q: any) => `if (${q.dartName} != null) '${q.name}': ${q.dartName},`).join('\n      ')}
    };`;
  }
  
  // Build headers
  let headersConstruction = '';
  if (hasHeaders) {
    headersConstruction = `
    final requestHeaders = <String, String>{
      ${headers.map((h: any) => `if (${h.dartName} != null) '${h.name}': ${h.dartName}.toString(),`).join('\n      ')}
    };`;
  }
  
  // Build response handling
  let responseHandling = '';
  if (response.isVoid) {
    responseHandling = 'return;';
  } else if (response.isList) {
    responseHandling = `
      return (response.data as List<dynamic>)
          .map((item) => ${response.itemType}.fromJson(item as Map<String, dynamic>))
          .toList();`;
  } else if (response.isModel) {
    responseHandling = `
      return ${response.type}.fromJson(response.data as Map<String, dynamic>);`;
  } else if (response.isPrimitive) {
    responseHandling = `
      return response.data as ${response.type};`;
  } else {
    responseHandling = `
      return response.data;`;
  }
  
  // Build complete implementation using the enhanced client
  return `
  Future<${response.dartType}> ${operationName}(${props.map((p: any) => `${p.type} ${p.name}`).join(', ')}) async {
    ${pathConstruction}
    ${queryParamsConstruction}
    ${headersConstruction}
    
    try {
      final response = await client.${httpMethod}(
        path,${hasBody ? `
        data: ${body.dartName}${body.isModel ? '.toJson()' : ''},` : ''}${hasQueryParams ? `
        queryParameters: queryParameters,` : ''}${hasHeaders ? `
        options: Options(headers: requestHeaders),` : ''}
      );
      
      ${responseHandling}
    } on DioException catch (e) {
      throw ApiException(
        statusCode: e.response?.statusCode,
        message: e.message ?? 'Unknown error occurred',
        error: e,
      );
    }
  }`;
};

/**
 * Generate custom client builder with service registration
 */
export const generateCustomClient: ClientBuilder = (
  verbOptions: GeneratorVerbOptions,
  options: GeneratorOptions,
) => {
  const implementation = generateCustomImplementation(verbOptions, options);
  
  const imports = [
    "import 'package:dio/dio.dart';",
    "import '../api_client.dart';",
    "import 'api_exception.dart';",
    "import '../models/index.dart';",
  ];
  
  return { implementation, imports };
};

/**
 * Generate enhanced custom client header
 */
export const generateCustomHeader: ClientHeaderBuilder = ({ title, isMutator }) => {
  return `
/// ${title ? `${title} - ` : ''}Service with enhanced custom client
/// This service uses the enhanced API client with service registration pattern
`;
};

/**
 * Get custom client dependencies
 */
export const getCustomDependencies: ClientDependenciesBuilder = () => {
  return [];  // Dependencies are managed by the user's custom client
};

/**
 * Generate custom client footer
 */
export const generateCustomFooter: ClientFooterBuilder = () => {
  return '';
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