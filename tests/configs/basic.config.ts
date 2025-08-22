import { defineConfig } from '../../packages/core/src';

export default defineConfig({
  petstore: {
    input: {
      target: '../specifications/petstore.yaml',
    },
    output: {
      mode: 'split',
      target: '../generated/petstore',
      client: 'dart-dio',
      override: {
        generator: {
          freezed: true,
          jsonSerializable: true,
          nullSafety: true,
        },
      },
    },
  },
});