const { generateDartCode } = require('../../packages/core/dist');
const path = require('path');

async function generate() {
  try {
    console.log('🚀 Generating Petstore API client...');
    
    const result = await generateDartCode({
      input: path.resolve(__dirname, './petstore.yaml'),
      output: {
        mode: 'split',
        target: path.resolve(__dirname, './lib/api'),
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
    });

    console.log('✅ Generated', result.length, 'files');
    console.log('📁 Output location: ./lib/api');
    console.log('\nGenerated files:');
    result.forEach(file => {
      if (typeof file === 'string') {
        console.log(`  - ${file.replace(__dirname, '.')}`);
      } else if (file && file.path) {
        console.log(`  - ${file.path.replace(__dirname, '.')}`);
      }
    });
    
    console.log('\n📝 Next steps:');
    console.log('1. Run: dart pub get');
    console.log('2. Run: dart run build_runner build');
    console.log('3. Use the generated API client in your Dart code');
  } catch (error) {
    console.error('❌ Generation failed:', error);
    process.exit(1);
  }
}

generate();