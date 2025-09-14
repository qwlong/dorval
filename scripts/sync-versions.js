#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Read root package.json version
const rootPackageJson = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8')
);
const version = rootPackageJson.version;

console.log(`Syncing all packages to version ${version}...`);

// Packages to sync
const packages = [
  'packages/core',
  'packages/dorval',
  'packages/dio',
  'packages/custom'
];

// Update each package
packages.forEach(pkgPath => {
  const packageJsonPath = path.join(rootDir, pkgPath, 'package.json');

  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const oldVersion = packageJson.version;

    if (oldVersion !== version) {
      packageJson.version = version;
      fs.writeFileSync(
        packageJsonPath,
        JSON.stringify(packageJson, null, 2) + '\n',
        'utf8'
      );
      console.log(`  ✓ ${packageJson.name}: ${oldVersion} → ${version}`);
    } else {
      console.log(`  ✓ ${packageJson.name}: already at ${version}`);
    }
  } else {
    console.log(`  ⚠ Package not found: ${pkgPath}`);
  }
});

console.log('Version sync complete!');