#!/bin/bash

# Dorval Publishing Script
# This script builds and publishes the dorval packages to npm

set -e

echo "🚀 Dorval Publishing Script"
echo "=========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if OTP is provided
if [ -z "$1" ]; then
    echo -e "${YELLOW}Usage: ./publish.sh <OTP>${NC}"
    echo "Please provide your npm OTP code as an argument"
    exit 1
fi

OTP=$1

echo "📦 Building packages..."
yarn build

echo ""
echo "📋 Package versions:"
echo "  - @dorval/core: $(node -p "require('./packages/core/package.json').version")"
echo "  - dorval: $(node -p "require('./packages/dorval/package.json').version")"

echo ""
echo "🔄 Publishing @dorval/core..."
cd packages/core
npm publish --otp=$OTP --access public
cd ../..

echo ""
echo "🔄 Publishing dorval CLI..."
cd packages/dorval
npm publish --otp=$OTP
cd ../..

echo ""
echo -e "${GREEN}✅ All packages published successfully!${NC}"
echo ""
echo "📝 Next steps:"
echo "  1. Push changes to GitHub: git push origin master"
echo "  2. Create a GitHub release for v$(node -p "require('./packages/dorval/package.json').version")"
echo "  3. Update the changelog"