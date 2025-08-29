/**
 * Generation script for Petstore API client
 * 
 * This script can be used in two ways:
 * 1. Directly with configuration object (shown here)
 * 2. Using dorval.config.js file (uncomment the config loading below)
 */

const { generateDartCode } = require('../../packages/core/dist');
const path = require('path');

async function generate() {
  try {
    console.log('🚀 Generating Petstore API client...');
    
    // Option 1: Direct configuration (currently used)
    const config = {
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
          dio: {
            baseUrl: 'https://petstore.swagger.io/v1',
            interceptors: []
          },
          methodNaming: 'operationId',
        },
      },
    };
    
    // Option 2: Load from dorval.config.js (uncomment to use)
    // const dorvalConfig = require('./dorval.config.js');
    // const config = dorvalConfig.petstore;
    // config.input = path.resolve(__dirname, config.input);
    // config.output.target = path.resolve(__dirname, config.output.target);
    
    const result = await generateDartCode(config);

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
    console.log('2. Run: dart run build_runner build --delete-conflicting-outputs');
    console.log('3. Run the example: dart run bin/main.dart');
  } catch (error) {
    console.error('❌ Generation failed:', error);
    process.exit(1);
  }
}

// Alternative: Command-line config file support
if (process.argv.includes('--config')) {
  console.log('Loading configuration from dorval.config.js...');
  const dorvalConfig = require('./dorval.config.js');
  const config = dorvalConfig.petstore;
  
  // Resolve paths
  config.input = path.resolve(__dirname, config.input);
  config.output.target = path.resolve(__dirname, config.output.target);
  
  generateDartCode(config)
    .then(result => {
      console.log('✅ Generated', result.length, 'files using dorval.config.js');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Generation failed:', error);
      process.exit(1);
    });
} else {
  // Run with inline configuration
  generate();
}