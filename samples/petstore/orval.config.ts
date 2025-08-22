import { defineConfig } from '../../packages/core/src';

export default defineConfig({
  petstore: {
    input: {
      target: './petstore.yaml',
      validation: true,
    },
    output: {
      mode: 'split',
      target: './lib/api',
      client: 'dart-dio',
      clean: true,
      override: {
        generator: {
          freezed: true,
          jsonSerializable: true,
          nullSafety: true,
          copyWith: true,
          equal: true,
        },
      },
    },
    hooks: {
      afterAllFilesWrite: async (paths: string[]) => {
        console.log('✅ Generated', paths.length, 'files');
        console.log('📁 Output location: ./lib/api');
        console.log('\nNext steps:');
        console.log('1. Run: dart pub get');
        console.log('2. Run: dart run build_runner build');
        console.log('3. Use the generated API client in your Dart code');
      },
    },
  },
});