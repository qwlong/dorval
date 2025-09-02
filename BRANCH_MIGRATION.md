# 🔄 从 master 迁移到 main 分支指南

## 为什么要迁移？

GitHub 和大多数现代开源项目已经将默认分支从 `master` 改为 `main`：
- 更包容的术语
- GitHub 新仓库的默认设置
- 社区标准和最佳实践

## 迁移步骤

### 1. 本地迁移

```bash
# 确保你在 master 分支上并且是最新的
git checkout master
git pull origin master

# 创建 main 分支
git branch -m master main

# 推送 main 分支到远程
git push -u origin main
```

### 2. GitHub 设置更新

在 GitHub 仓库设置中：

1. **更改默认分支**：
   - 进入 Settings → Branches
   - 点击默认分支旁边的 🔄 切换按钮
   - 选择 `main` 作为新的默认分支
   - 点击 "Update"

2. **更新分支保护规则**（如果有）：
   - 在 Settings → Branches
   - 为 `main` 分支添加保护规则
   - 复制之前 `master` 的规则设置

3. **更新 GitHub Pages**（如果使用）：
   - Settings → Pages
   - Source 改为 `main` 分支

### 3. 本地清理

```bash
# 删除本地的 master 分支
git branch -d master

# 更新本地的远程引用
git fetch --prune
git remote set-head origin -a
```

### 4. 通知其他开发者

让团队成员更新他们的本地仓库：

```bash
# 其他开发者需要执行
git checkout master
git branch -m master main
git fetch origin
git branch -u origin/main main
git remote set-head origin -a
```

### 5. 更新文档和脚本

需要更新的地方：
- ✅ CI/CD 配置（已更新为同时支持 main 和 master）
- README 中的徽章链接
- 贡献指南中的分支引用
- 任何硬编码的分支名称

### 6. 删除远程 master 分支（可选）

完全迁移后，可以删除远程的 master 分支：

```bash
# ⚠️ 确保所有人都已迁移后再执行
git push origin --delete master
```

## 已完成的准备工作

✅ **GitHub Actions 工作流已配置为同时支持 `main` 和 `master`**
- CI 会在两个分支上都运行
- 发布流程支持两个分支
- 迁移期间不会中断 CI/CD

## 建议的迁移时机

最佳时机：
- 发布 v1.0.0 之前
- 或者在下一个主要版本发布时
- 确保通知所有贡献者

## 回滚方案

如果需要回滚：

```bash
# 本地回滚
git checkout main
git branch -m main master
git push -u origin master

# 在 GitHub 上重新设置默认分支为 master
```

---

**注意**：工作流文件已经配置为同时支持两个分支名，所以迁移可以逐步进行，不会影响 CI/CD。