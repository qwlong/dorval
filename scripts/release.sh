#!/bin/bash

# Release script for Dorval
# Usage: ./scripts/release.sh [version] [type]
# Example: ./scripts/release.sh 1.0.0 latest

set -e

VERSION=$1
TAG_TYPE=${2:-latest}

if [ -z "$VERSION" ]; then
  echo "❌ Please provide a version number"
  echo "Usage: ./scripts/release.sh [version] [type]"
  echo "Example: ./scripts/release.sh 1.0.0 latest"
  exit 1
fi

echo "🚀 Releasing Dorval v$VERSION with tag: $TAG_TYPE"
echo ""

# Update versions
echo "📦 Updating package versions..."
node scripts/version.js $VERSION

# Build
echo "🔨 Building packages..."
yarn build

# Run tests
echo "🧪 Running tests..."
yarn test

# Git operations
echo "📝 Committing changes..."
git add -A
git commit -m "chore: release v$VERSION" || true

# Create tag
echo "🏷️  Creating git tag..."
git tag -a "v$VERSION" -m "Release v$VERSION"

# Push
echo "📤 Pushing to GitHub..."
git push origin main
git push origin "v$VERSION"

echo ""
echo "✅ Release preparation complete!"
echo ""
echo "📋 Next steps:"
echo "1. Go to GitHub and create a release from tag v$VERSION"
echo "2. Or trigger the publish workflow manually:"
echo "   gh workflow run publish.yml -f version=$VERSION -f tag=$TAG_TYPE"
echo ""
echo "🔗 Links:"
echo "   https://github.com/qwlong/dorval/releases/new?tag=v$VERSION"