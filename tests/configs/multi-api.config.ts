import { defineConfig } from '@dorval/core';

// Test configuration with multiple APIs
export default defineConfig({
  // First API - Petstore
  petstore: {
    input: './specifications/petstore.yaml',
    output: {
      mode: 'split',
      target: './generated/multi/petstore',
      client: 'dio',
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
    input: './specifications/advanced.yaml',
    output: {
      mode: 'split',
      target: './generated/multi/advanced',
      client: 'dio',
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
    input: './specifications/petstore.yaml',
    output: {
      mode: 'single',
      target: './generated/multi/single/api.dart',
      client: 'dio',
    },
  },
});