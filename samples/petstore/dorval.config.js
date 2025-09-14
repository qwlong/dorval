/**
 * Dorval configuration for Petstore API sample
 * Generates Dart/Flutter API client with Freezed models
 */

module.exports = {
  petstore: {
    input: './petstore.yaml',
    output: {
      target: './lib/api',
      mode: 'split',
      client: 'dio',
      clean: true,
      override: {
        generator: {
          freezed: true,
          jsonSerializable: true,
          nullSafety: true,
          copyWith: true,
          equal: true,
        },
        dio: {
          baseUrl: 'https://petstore.swagger.io/v1',
          interceptors: []
        },
        methodNaming: 'methodPath',
        // Custom headers configuration (optional for this sample)
        headers: {
          // Define reusable header classes if needed
          definitions: {
            // Example: If the petstore API required authentication
            AuthHeader: {
              fields: ['Authorization'],
              required: ['Authorization'],
              description: 'Bearer token authentication'
            },

            // Example: API key authentication
            ApiKeyHeader: {
              fields: ['X-API-Key'],
              required: ['X-API-Key'],
              description: 'API key authentication'
            }
          }
          // The system will automatically match endpoints to these definitions
          // based on the headers they actually use
        }
      }
    },
    hooks: {
      afterAllFilesWrite: 'console.log("✅ Generated Petstore API client successfully!")'
    }
  }
};