# How to Run Tests / 如何运行测试

## Prerequisites / 前置条件
```bash
# Make sure you're in the dorval directory
cd /Users/apple/Projects/workstream/repos/orval-workspace/dorval

# Install dependencies
yarn install

# Build the project first
yarn build
```

## ⚠️ Important Note / 重要提示
Not all packages have tests. Only `@dorval/core` has test files.
并非所有包都有测试。只有 `@dorval/core` 包有测试文件。

- ✅ `@dorval/core` - Has tests / 有测试
- ❌ `@dorval/dio` - No tests / 无测试  
- ❌ `@dorval/custom` - No tests / 无测试
- ❌ `dorval` - No tests / 无测试

## Running Tests / 运行测试

### 1. Run All Tests / 运行所有测试
```bash
# From dorval root directory
yarn test

# Or from the core package directory
cd packages/core
yarn test
```

### 2. Run Tests for Specific Package / 运行特定包的测试
```bash
# Test only @dorval/core package
cd packages/core
yarn test

# Test only @dorval/dorval package
cd packages/dorval
yarn test
```

### 3. Run Specific Test File / 运行特定测试文件
```bash
cd packages/core

# Run a single test file
yarn test endpoint-generator.test.ts

# Or with full path
yarn test src/__tests__/generators/endpoint-generator.test.ts
```

### 4. Run Tests by Pattern / 按模式运行测试
```bash
# Run all generator tests
yarn test generators

# Run all parser tests  
yarn test parser

# Run all utils tests
yarn test utils

# Run tests matching a pattern
yarn test type-mapper
```

### 5. Run Tests in Watch Mode / 监听模式运行测试
```bash
# Watch mode - re-runs tests when files change
yarn test --watch

# Watch specific test
yarn test endpoint-generator --watch
```

### 6. Run Tests with Coverage / 运行测试并生成覆盖率报告
```bash
# Generate coverage report
yarn test --coverage

# Coverage will be in coverage/ directory
```

### 7. Run Tests in UI Mode / UI 模式运行测试
```bash
# Open Vitest UI (if available)
yarn test --ui
```

### 8. Debug Failed Tests / 调试失败的测试
```bash
# Run with verbose output
yarn test --verbose

# Run specific failing test
yarn test "should handle array query parameters"

# Run with detailed error output
yarn test --reporter=verbose
```

## Test Structure / 测试结构
```
packages/core/src/__tests__/
├── generators/       # Generator tests
│   ├── endpoint-generator.test.ts
│   ├── endpoint-generator-roles.test.ts
│   ├── headers-generator.test.ts
│   ├── models-generator.test.ts
│   └── ...
├── parser/          # Parser tests
│   ├── openapi-parser.test.ts
│   └── references-parser.test.ts
├── utils/           # Utility tests
│   ├── type-mapper.test.ts
│   ├── file.test.ts
│   └── ...
├── integration/     # Integration tests
│   └── integration.test.ts
└── fixtures/        # Test fixtures
    └── petstore.yaml
```

## Common Test Commands / 常用测试命令

```bash
# Quick test run
yarn test

# Test with pattern matching
yarn test endpoint

# Test specific describe block
yarn test -t "Parameter Processing"

# Test and update snapshots
yarn test -u

# Run failed tests only
yarn test --bail

# Run tests sequentially (not in parallel)
yarn test --sequence
```

## Troubleshooting / 故障排除

### If tests fail with import errors / 如果测试因导入错误失败
```bash
# Rebuild the project
yarn build

# Clear cache and reinstall
rm -rf node_modules
yarn install
yarn build
```

### If specific test keeps failing / 如果特定测试持续失败
```bash
# Run that test in isolation
yarn test "test name" --no-coverage

# Check the test file directly
yarn vitest run src/__tests__/generators/endpoint-generator.test.ts
```

## CI/CD Integration / 持续集成

```bash
# Run tests in CI mode (no watch, with coverage)
yarn test --run --coverage

# Run with specific reporter for CI
yarn test --reporter=json > test-results.json
```

## Test Configuration / 测试配置
The test configuration is in `vitest.config.ts` or `vite.config.ts`.

## Tips / 提示
1. Always run `yarn build` before testing if you've made code changes
2. Use `--watch` mode during development for faster feedback
3. Focus on one test file at a time when debugging
4. Check test output carefully - the error message usually tells you exactly what's wrong

## Example Test Session / 测试会话示例
```bash
# 1. Navigate to project
cd /Users/apple/Projects/workstream/repos/orval-workspace/dorval

# 2. Build project
yarn build

# 3. Run all tests
yarn test

# 4. If a test fails, run it individually
cd packages/core
yarn test endpoint-generator

# 5. Fix the issue and re-run
yarn test endpoint-generator --watch

# 6. Once fixed, run all tests again
yarn test
```