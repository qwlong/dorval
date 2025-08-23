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

const DIO_DEPENDENCIES: GeneratorDependency[] = [
  {
    exports: [
      { name: 'Dio', default: false, values: false },
      { name: 'Options', default: false, values: false },
      { name: 'DioException', default: false, values: false },
      { name: 'Response', default: false, values: false },
    ],
    dependency: 'dio',
  },
];

/**
 * Generate Dio client implementation for a service method
 */
const generateDioImplementation = (
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
    override,
    formData,
    formUrlEncoded,
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
  
  // Build method call
  let methodCall = `await client.${httpMethod}(
      path,`;
  
  if (hasBody) {
    methodCall += `
      data: ${body.dartName}${body.isModel ? '.toJson()' : ''},`;
  }
  
  if (hasQueryParams) {
    methodCall += `
      queryParameters: queryParameters,`;
  }
  
  if (hasHeaders) {
    methodCall += `
      options: Options(headers: requestHeaders),`;
  }
  
  methodCall += `
    )`;
  
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
  
  // Build complete implementation
  return `
  Future<${response.dartType}> ${operationName}(${props.map((p: any) => `${p.type} ${p.name}`).join(', ')}) async {
    ${pathConstruction}
    ${queryParamsConstruction}
    ${headersConstruction}
    
    try {
      final response = ${methodCall};
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
 * Generate Dio client builder
 */
export const generateDioClient: ClientBuilder = (
  verbOptions: GeneratorVerbOptions,
  options: GeneratorOptions,
) => {
  const implementation = generateDioImplementation(verbOptions, options);
  
  const imports = [
    "import 'package:dio/dio.dart';",
    "import '../api_client.dart';",
    "import '../api_exception.dart';",
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
 * Generate Dio header
 */
export const generateDioHeader: ClientHeaderBuilder = ({ title }) => {
  return `
/// ${title ? `${title} - ` : ''}Generated Dio client service
/// This service uses Dio for HTTP requests
`;
};

/**
 * Get Dio dependencies
 */
export const getDioDependencies: ClientDependenciesBuilder = (
  hasGlobalMutator: boolean,
) => {
  if (hasGlobalMutator) {
    return []; // Don't include Dio dependencies if using custom mutator
  }
  return DIO_DEPENDENCIES;
};

/**
 * Generate Dio footer
 */
export const generateDioFooter: ClientFooterBuilder = ({ operationNames }) => {
  return ''; // No special footer needed for Dio
};

/**
 * Dio client builder configuration
 */
const dioClientBuilder: ClientGeneratorBuilder = {
  client: generateDioClient,
  header: generateDioHeader,
  dependencies: getDioDependencies,
  footer: generateDioFooter,
};

/**
 * Builder factory function (following Orval pattern)
 */
export const builder = () => () => dioClientBuilder;

export default builder;