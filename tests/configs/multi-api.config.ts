import { defineConfig } from '../../packages/core/src';

// Test configuration with multiple APIs
export default defineConfig({
  // First API - Petstore
  petstore: {
    input: {
      target: '../specifications/petstore.yaml',
    },
    output: {
      mode: 'split',
      target: '../generated/multi/petstore',
      client: 'dart-dio',
      override: {
        generator: {
          freezed: true,
          jsonSerializable: true,
        },
      },
    },
  },
  
  // Second API - Advanced features
  advanced: {
    input: {
      target: '../specifications/advanced.yaml',
    },
    output: {
      mode: 'split',
      target: '../generated/multi/advanced',
      client: 'dart-dio',
      override: {
        generator: {
          freezed: true,
          jsonSerializable: true,
        },
      },
    },
  },
  
  // Third API - Single file mode test
  singleFile: {
    input: {
      target: '../specifications/petstore.yaml',
    },
    output: {
      mode: 'single',
      target: '../generated/multi/single/api.dart',
      client: 'dart-dio',
    },
  },
});