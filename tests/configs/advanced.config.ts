import { defineConfig } from '../../packages/core/src';

export default defineConfig({
  advanced: {
    input: {
      target: '../specifications/advanced.yaml',
      validation: true,
    },
    output: {
      mode: 'split',
      target: '../generated/advanced',
      client: 'dart-dio',
      clean: true,
      override: {
        generator: {
          freezed: true,
          jsonSerializable: true,
          nullSafety: true,
          copyWith: true,
          equal: true,
          toString: true,
        },
        // Test custom headers
        operations: {
          getUsers: {
            headers: {
              'X-Custom-Header': 'test-value',
            },
          },
        },
      },
    },
    hooks: {
      afterAllFilesWrite: 'dart format ../generated/advanced',
    },
  },
});