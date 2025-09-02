#!/usr/bin/env node

/**
 * Version management script for Dorval monorepo
 * Usage: node scripts/version.js <version>
 * Example: node scripts/version.js 1.0.0
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const version = process.argv[2];

if (!version) {
  console.error('❌ Please provide a version number');
  console.log('Usage: node scripts/version.js <version>');
  console.log('Example: node scripts/version.js 1.0.0');
  process.exit(1);
}

// Validate version format
if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version)) {
  console.error('❌ Invalid version format. Use semantic versioning (e.g., 1.0.0, 1.0.0-beta.1)');
  process.exit(1);
}

console.log(`📦 Updating all packages to version ${version}...`);

const packages = [
  '.',  // Root package.json
  'packages/core',
  'packages/dorval',
  'packages/dio',
  'packages/custom'
];

let hasErrors = false;

packages.forEach(pkg => {
  const packagePath = path.join(__dirname, '..', pkg);
  const packageJsonPath = path.join(packagePath, 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    console.warn(`⚠️  Skipping ${pkg} (package.json not found)`);
    return;
  }
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const oldVersion = packageJson.version;
    packageJson.version = version;
    
    // Update dependencies if they reference workspace packages
    if (packageJson.dependencies) {
      Object.keys(packageJson.dependencies).forEach(dep => {
        if (dep.startsWith('@dorval/')) {
          packageJson.dependencies[dep] = version;
        }
      });
    }
    
    if (packageJson.devDependencies) {
      Object.keys(packageJson.devDependencies).forEach(dep => {
        if (dep.startsWith('@dorval/')) {
          packageJson.devDependencies[dep] = version;
        }
      });
    }
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`✅ ${pkg}: ${oldVersion} → ${version}`);
  } catch (error) {
    console.error(`❌ Failed to update ${pkg}: ${error.message}`);
    hasErrors = true;
  }
});

if (hasErrors) {
  console.error('\n❌ Some packages failed to update');
  process.exit(1);
}

console.log('\n✅ All packages updated successfully!');
console.log('\n📝 Next steps:');
console.log('1. Review the changes: git diff');
console.log('2. Commit the changes: git commit -am "chore: bump version to ' + version + '"');
console.log('3. Create a tag: git tag v' + version);
console.log('4. Push changes: git push && git push --tags');
console.log('5. Create a GitHub release or run the publish workflow');