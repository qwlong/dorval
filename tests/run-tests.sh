#!/bin/bash

# Dorval Test Runner Script
# Run all test configurations and verify generation

set -e

echo "🧪 Dorval Test Runner"
echo "===================="

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to run a test
run_test() {
    local name=$1
    local config=$2
    
    echo ""
    echo "📦 Running test: $name"
    echo "   Config: $config"
    
    # Clean the output directory
    if [ -d "../generated/$name" ]; then
        rm -rf "../generated/$name"
    fi
    
    # Run the generation
    if node ../packages/dorval/dist/bin/dorval.js generate -c "$config"; then
        echo -e "   ${GREEN}✅ Generation successful${NC}"
        
        # Check if files were created
        if [ -d "../generated/$name" ]; then
            file_count=$(find "../generated/$name" -type f -name "*.dart" | wc -l)
            echo -e "   ${GREEN}📄 Generated $file_count Dart files${NC}"
        else
            echo -e "   ${YELLOW}⚠️  No output directory found${NC}"
        fi
        
        return 0
    else
        echo -e "   ${RED}❌ Generation failed${NC}"
        return 1
    fi
}

# Build the packages first
echo "🔨 Building packages..."
cd ..
if yarn build > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi
cd tests

# Create generated directory if it doesn't exist
mkdir -p generated

# Test counters
total_tests=0
passed_tests=0

# Run basic test
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: Basic Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
((total_tests++))
if run_test "petstore" "configs/basic.config.ts"; then
    ((passed_tests++))
fi

# Run advanced test
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2: Advanced Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
((total_tests++))
if run_test "advanced" "configs/advanced.config.ts"; then
    ((passed_tests++))
    
    # Run post-generation hook if specified
    if [ -d "../generated/advanced" ]; then
        echo "   🎨 Running dart format..."
        dart format ../generated/advanced > /dev/null 2>&1 || true
    fi
fi

# Run multi-api test
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 3: Multi-API Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
((total_tests++))
if run_test "multi" "configs/multi-api.config.ts"; then
    ((passed_tests++))
    
    # Check each sub-directory
    for dir in petstore advanced single; do
        if [ -d "../generated/multi/$dir" ]; then
            echo -e "   ${GREEN}✅ Found $dir output${NC}"
        else
            echo -e "   ${YELLOW}⚠️  Missing $dir output${NC}"
        fi
    done
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   Total tests: $total_tests"
echo "   Passed: $passed_tests"
echo "   Failed: $((total_tests - passed_tests))"

if [ $passed_tests -eq $total_tests ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi