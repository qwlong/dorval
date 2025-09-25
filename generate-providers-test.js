#!/usr/bin/env node

import { generateDartCode } from './packages/core/dist/index.js';
import path from 'path';

async function generateProvidersExample() {
  try {
    console.log('🚀 Generating Dart code with Riverpod Providers...\n');

    const options = {
      input: '../test-shifts-api.json',
      output: {
        target: './generated-providers-test',
        mode: 'providers',  // New providers mode!
        client: 'dio',
        override: {
          generator: {
            freezed: true,
            jsonSerializable: true,
            nullSafety: true,
            partFiles: true
          },
          providers: {
            style: 'class',          // Class-based providers
            autoDispose: true,       // Auto-dispose for caching
            smartRefresh: true,      // Smart refresh after mutations
            generateHelpers: true    // Generate pagination helpers
          }
        }
      }
    };

    const files = await generateDartCode(options);

    console.log(`✅ Generated ${files.length} files\n`);

    // List provider files
    const providerFiles = files.filter(f => f.path.startsWith('providers/'));
    console.log('📦 Provider files generated:');
    providerFiles.forEach(f => {
      console.log(`   - ${f.path}`);
    });

    // Show a sample of the generated providers
    const shiftsProvider = files.find(f => f.path.includes('shifts_providers.dart'));
    if (shiftsProvider) {
      console.log('\n📄 Sample of generated shifts_providers.dart:\n');
      console.log('=' .repeat(60));
      // Show first 100 lines
      const lines = shiftsProvider.content.split('\n').slice(0, 100);
      console.log(lines.join('\n'));
      console.log('=' .repeat(60));
      console.log('... (truncated)\n');
    }

    // Show base providers
    const baseProviders = files.find(f => f.path === 'providers/base_providers.dart');
    if (baseProviders) {
      console.log('📄 Base providers (base_providers.dart):\n');
      console.log('=' .repeat(60));
      console.log(baseProviders.content);
      console.log('=' .repeat(60));
    }

    console.log('\n✨ Generation complete! Check ./generated-providers-test/\n');

    // Explain features
    console.log('🎯 Key Features Implemented:\n');
    console.log('1. ✅ Caching: FutureProvider with autoDispose for automatic cache management');
    console.log('2. ✅ Pagination: StateNotifierProvider with PaginationNotifier for infinite scroll');
    console.log('3. ✅ Auto-refresh: ref.invalidate() called after mutations to refresh related data');
    console.log('4. ✅ Parameters: FutureProvider.family for parameterized queries');
    console.log('5. ✅ Helper classes: Parameter classes and pagination state management\n');

  } catch (error) {
    console.error('❌ Generation failed:', error);
    process.exit(1);
  }
}

generateProvidersExample();