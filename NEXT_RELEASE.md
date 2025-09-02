# 📋 Next Release Plan for Dorval v1.0.0

## 🎯 发布前准备清单

### 1. 设置 NPM Token ⏳
- [ ] 登录 [npmjs.com](https://www.npmjs.com)
- [ ] 进入 Account Settings → Access Tokens
- [ ] 创建 "Automation" token
- [ ] 在 GitHub 仓库 Settings → Secrets → Actions 添加 `NPM_TOKEN`

### 2. 分支管理（可选） ⏳
- [ ] 决定是否从 `master` 迁移到 `main`
- [ ] 如果迁移，参考 `BRANCH_MIGRATION.md`

### 3. 首次发布测试 ⏳
```bash
# 1. 登录 npm
npm login

# 2. 测试构建
yarn build
yarn test

# 3. 检查包内容
npm pack --dry-run

# 4. 发布 v1.0.0
./scripts/publish.sh 1.0.0 latest

# 5. 推送到 GitHub
git push origin master
git push origin v1.0.0
```

## 📦 已准备好的 CI/CD 配置

### GitHub Actions 工作流
✅ **`.github/workflows/ci.yml`** - 持续集成
- 多版本 Node.js 测试 (18.x, 20.x)
- 自动运行测试、构建、代码检查
- Dart 代码分析和测试
- 代码覆盖率报告

✅ **`.github/workflows/publish.yml`** - NPM 发布
- 手动触发或 Release 触发
- 支持多种标签 (latest, beta, next, alpha)
- 自动发布所有包

✅ **`.github/workflows/release.yml`** - 自动化发布
- Semantic release 集成
- 自动版本管理

### 发布脚本
✅ **`scripts/publish.sh`** - 增强版发布脚本
```bash
# 用法
./scripts/publish.sh [version] [tag]
# 示例
./scripts/publish.sh 1.0.0 latest
```

✅ **`scripts/version.js`** - 版本同步工具
```bash
# 更新所有包版本
node scripts/version.js 1.0.0
```

### Package.json 脚本
```json
{
  "scripts": {
    "version:update": "node scripts/version.js",
    "publish:npm": "./scripts/publish.sh",
    "ci": "yarn build && yarn test && yarn lint"
  }
}
```

## 📊 已添加的 README 徽章

```markdown
![CI Status](https://github.com/qwlong/dorval/actions/workflows/ci.yml/badge.svg)
![npm version](https://img.shields.io/npm/v/dorval.svg)
![npm downloads](https://img.shields.io/npm/dm/dorval.svg)
![codecov](https://codecov.io/gh/qwlong/dorval/branch/master/graph/badge.svg)
```

## 🚀 发布流程选项

### 选项 1: 本地发布（推荐首次）
```bash
./scripts/publish.sh 1.0.0 latest
```

### 选项 2: GitHub Actions 发布
1. 创建 GitHub Release
2. 或手动触发 publish.yml workflow

## 📝 发布后任务

- [ ] 在 GitHub 创建 Release Notes
- [ ] 更新项目文档
- [ ] 在社区宣传
  - [ ] Twitter/X 发布
  - [ ] Reddit r/FlutterDev
  - [ ] Flutter 社区论坛
  - [ ] Dev.to 文章
- [ ] 提交到 Dart Packages（如果有配套 Dart 包）

## 🎉 v1.0.0 亮点

### 核心功能
- ✅ 完整的 OpenAPI 3.0 支持
- ✅ Dio 客户端生成
- ✅ Freezed 模型生成
- ✅ 完整的空安全支持
- ✅ 智能头部合并

### 质量保证
- ✅ 335 个测试，99% 通过率
- ✅ TypeScript 严格模式
- ✅ 完善的错误处理

### 开发体验
- ✅ 简单的 CLI 命令
- ✅ 灵活的配置选项
- ✅ 清晰的文档

## 💡 提醒事项

1. **GitHub Actions 对公开仓库完全免费**
2. **首次发布建议使用本地脚本测试**
3. **确保所有测试通过后再发布**
4. **发布后无法撤回，请谨慎操作**

---

**准备好后，执行 `./scripts/publish.sh 1.0.0 latest` 即可发布！** 🚀