#!/usr/bin/env node

/**
 * Dorval Test Runner
 * JavaScript version of the test runner
 */

const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Test configurations
const tests = [
  {
    name: 'Basic Configuration',
    config: 'configs/basic.config.ts',
    outputDir: 'generated/petstore',
    description: 'Standard Freezed model generation with Dio client',
  },
  {
    name: 'Advanced Configuration',
    config: 'configs/advanced.config.ts',
    outputDir: 'generated/advanced',
    description: 'Advanced features including allOf, oneOf, custom headers',
    postHook: 'dart format generated/advanced',
  },
  {
    name: 'Multi-API Configuration',
    config: 'configs/multi-api.config.ts',
    outputDirs: [
      'generated/multi/petstore',
    ],
    description: 'Multiple APIs with different output modes (Note: CLI currently only supports first API in multi-config)',
  },
];

// Utility functions
function log(message, color = '') {
  console.log(color + message + colors.reset);
}

function runCommand(command, silent = false, cwd = __dirname) {
  try {
    const output = execSync(command, { 
      cwd: cwd,
      stdio: silent ? 'pipe' : 'inherit'
    });
    return { success: true, output: output?.toString() };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function countFiles(dir, extension = '.dart') {
  if (!fs.existsSync(dir)) return 0;
  
  let count = 0;
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      count += countFiles(fullPath, extension);
    } else if (file.name.endsWith(extension)) {
      count++;
    }
  }
  
  return count;
}

async function runTest(test, index) {
  log(`\n${'━'.repeat(50)}`, colors.cyan);
  log(`Test ${index + 1}: ${test.name}`, colors.cyan);
  log(`${'━'.repeat(50)}`, colors.cyan);
  log(`📝 ${test.description}`);
  log(`📂 Config: ${test.config}`);
  
  // Clean output directories
  const outputDirs = test.outputDirs || [test.outputDir];
  for (const dir of outputDirs) {
    const fullPath = path.join(__dirname, dir);
    if (fs.existsSync(fullPath)) {
      fs.removeSync(fullPath);
      log(`🧹 Cleaned: ${dir}`, colors.yellow);
    }
  }
  
  // Run generation
  log(`\n🔨 Generating code...`);
  const result = runCommand(
    `node ../packages/dorval/dist/bin/dorval.js generate -c ${test.config}`,
    true
  );
  
  if (result.success) {
    log(`✅ Generation successful`, colors.green);
    
    // Count generated files
    for (const dir of outputDirs) {
      const fullPath = path.join(__dirname, dir);
      if (fs.existsSync(fullPath)) {
        const fileCount = countFiles(fullPath);
        log(`📄 Generated ${fileCount} Dart files in ${dir}`, colors.green);
      } else {
        log(`⚠️  No output in ${dir}`, colors.yellow);
      }
    }
    
    // Run post-hook if specified
    if (test.postHook) {
      log(`🎨 Running post-hook: ${test.postHook}`);
      runCommand(test.postHook, true);
    }
    
    return true;
  } else {
    log(`❌ Generation failed`, colors.red);
    if (result.error) {
      console.error(result.error);
    }
    return false;
  }
}

async function main() {
  log('\n🧪 Dorval Test Runner', colors.blue);
  log('====================\n', colors.blue);
  
  // Build packages first
  log('🔨 Building packages...');
  const parentDir = path.join(__dirname, '..');
  const buildResult = runCommand('yarn build', true, parentDir);
  
  if (!buildResult.success) {
    log('❌ Build failed', colors.red);
    console.error(buildResult.error);
    process.exit(1);
  }
  log('✅ Build successful', colors.green);
  
  // Change back to tests directory
  process.chdir(__dirname);
  
  // Create generated directory
  fs.ensureDirSync('generated');
  
  // Run tests
  let passed = 0;
  let failed = 0;
  
  for (let i = 0; i < tests.length; i++) {
    const success = await runTest(tests[i], i);
    if (success) {
      passed++;
    } else {
      failed++;
    }
  }
  
  // Summary
  log(`\n${'━'.repeat(50)}`, colors.cyan);
  log('📊 Test Summary', colors.cyan);
  log(`${'━'.repeat(50)}`, colors.cyan);
  log(`   Total tests: ${tests.length}`);
  log(`   Passed: ${passed}`, colors.green);
  log(`   Failed: ${failed}`, failed > 0 ? colors.red : colors.green);
  
  if (failed === 0) {
    log('\n✅ All tests passed!', colors.green);
    process.exit(0);
  } else {
    log('\n❌ Some tests failed', colors.red);
    process.exit(1);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  log(`\n❌ Unexpected error: ${error.message}`, colors.red);
  process.exit(1);
});

// Run main
main().catch(error => {
  log(`\n❌ Test runner failed: ${error.message}`, colors.red);
  process.exit(1);
});