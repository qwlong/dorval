#!/bin/bash

# Dorval NPM Publishing Script
# This script helps publish dorval packages to npm

set -e

echo "🚀 Preparing to publish Dorval packages..."

# Check if user is logged in to npm
echo "📝 Checking npm login status..."
npm whoami || (echo "❌ Please login to npm first: npm login" && exit 1)

# Build packages
echo "🔨 Building packages..."
yarn build

# Publish @dorval/core first (since dorval depends on it)
echo "📦 Publishing @dorval/core..."
cd packages/core
npm publish --access public
cd ../..

# Wait a moment for npm to process
echo "⏳ Waiting for npm to process @dorval/core..."
sleep 5

# Publish dorval CLI
echo "📦 Publishing dorval..."
cd packages/dorval
npm publish
cd ../..

echo "✅ Successfully published all packages!"
echo ""
echo "📋 Published packages:"
echo "  - @dorval/core"
echo "  - dorval"
echo ""
echo "🎉 Installation:"
echo "  npm install -g dorval"
echo "  npm install @dorval/core"