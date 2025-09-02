#!/bin/bash

# Dorval NPM Publishing Script
# This script helps publish dorval packages to npm
# Usage: ./scripts/publish.sh [version] [tag]
# Example: ./scripts/publish.sh 1.0.0 latest

set -e

VERSION=$1
TAG=${2:-latest}

echo "🚀 Preparing to publish Dorval packages..."

# If version is provided, update all packages
if [ ! -z "$VERSION" ]; then
  echo "📦 Updating all packages to version $VERSION..."
  node scripts/version.js $VERSION
fi

# Check if user is logged in to npm
echo "📝 Checking npm login status..."
npm whoami || (echo "❌ Please login to npm first: npm login" && exit 1)

# Run tests first
echo "🧪 Running tests..."
yarn test

# Build packages
echo "🔨 Building packages..."
yarn build

# Publish @dorval/core first (since other packages depend on it)
echo "📦 Publishing @dorval/core..."
cd packages/core
npm publish --access public --tag $TAG
cd ../..

# Wait a moment for npm to process
echo "⏳ Waiting for npm to process @dorval/core..."
sleep 5

# Publish @dorval/dio
if [ -d "packages/dio" ]; then
  echo "📦 Publishing @dorval/dio..."
  cd packages/dio
  npm publish --access public --tag $TAG || echo "⚠️  @dorval/dio publish failed (may not exist)"
  cd ../..
fi

# Publish @dorval/custom
if [ -d "packages/custom" ]; then
  echo "📦 Publishing @dorval/custom..."
  cd packages/custom
  npm publish --access public --tag $TAG || echo "⚠️  @dorval/custom publish failed (may not exist)"
  cd ../..
fi

# Publish dorval CLI
echo "📦 Publishing dorval CLI..."
cd packages/dorval
npm publish --access public --tag $TAG
cd ../..

echo "✅ Successfully published all packages!"
echo ""
echo "📋 Published packages:"
echo "  - @dorval/core@$TAG"
echo "  - @dorval/dio@$TAG (if exists)"
echo "  - @dorval/custom@$TAG (if exists)"
echo "  - dorval@$TAG"
echo ""
echo "🎉 Installation:"
echo "  npm install -g dorval@$TAG"
echo "  npm install --save-dev @dorval/core@$TAG"

# Git operations if version was provided
if [ ! -z "$VERSION" ]; then
  echo ""
  echo "📝 Creating git tag..."
  git add -A
  git commit -m "chore: release v$VERSION" || true
  git tag -a "v$VERSION" -m "Release v$VERSION" || true
  
  echo ""
  echo "📤 Next steps:"
  echo "1. Push changes: git push origin master && git push origin v$VERSION"
  echo "2. Create GitHub release: https://github.com/qwlong/dorval/releases/new?tag=v$VERSION"
fi