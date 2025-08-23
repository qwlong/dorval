import { defineConfig } from '@dorval/core';

export default defineConfig({
  petstore: {
    input: './specifications/petstore.yaml',
    output: {
      mode: 'split',
      target: './generated/petstore',
      client: 'dio',
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