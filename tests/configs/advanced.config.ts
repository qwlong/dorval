import { defineConfig } from '@dorval/core';

export default defineConfig({
  advanced: {
    input: './specifications/advanced.yaml',
    output: {
      mode: 'split',
      target: './generated/advanced',
      client: 'dio',
      override: {
        generator: {
          freezed: true,
          jsonSerializable: true,
          nullSafety: true,
          // Note: These options are not yet supported in DartGeneratorOptions
          // copyWith: true,
          // equal: true,
          // toString: true,
        },
        // Note: Custom headers per operation not yet supported
        // operations: {
        //   getUsers: {
        //     headers: {
        //       'X-Custom-Header': 'test-value',
        //     },
        //   },
        // },
      },
    },
    // Note: hooks not yet supported in DartGeneratorOptions
    // hooks: {
    //   afterAllFilesWrite: 'dart format ./generated/advanced',
    // },
  },
});