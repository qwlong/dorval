# Release Process

This project uses **semantic-release** to automate the release process, ensuring version consistency between npm and package.json files.

## How It Works

### 1. **Automatic Version Management**
- Semantic-release analyzes your commit messages to determine the next version
- Updates all package.json files automatically
- Publishes to npm with the correct version
- Creates git tags and GitHub releases

### 2. **Version Consistency Guaranteed**
The release process ensures version consistency by:
1. Analyzing commits to determine version bump
2. Updating all package.json files in the monorepo
3. Committing the version changes
4. Publishing to npm (after version is committed)
5. Creating a git tag with the version

This flow ensures the npm published version ALWAYS matches package.json.

## Commit Message Format

Use [Angular Commit Message Conventions](https://github.com/angular/angular/blob/master/CONTRIBUTING.md#-commit-message-format):

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Version Bumping Rules

| Commit Type | Release Type | Version Bump | Example |
|------------|--------------|--------------|---------|
| `fix:` | Patch | 0.2.0 → 0.2.1 | `fix: correct header parsing` |
| `feat:` | Minor | 0.2.0 → 0.3.0 | `feat: add enum support` |
| `BREAKING CHANGE:` | Major | 0.2.0 → 1.0.0 | `feat!: change API structure` |
| `perf:` | Patch | 0.2.0 → 0.2.1 | `perf: optimize parsing` |
| `docs:` | No release | - | `docs: update README` |
| `chore:` | No release | - | `chore: update deps` |
| `chore(deps):` | Patch | 0.2.0 → 0.2.1 | `chore(deps): update dependencies` |

### Examples

```bash
# Patch release (0.2.0 → 0.2.1)
git commit -m "fix: resolve null reference error in model generator"

# Minor release (0.2.0 → 0.3.0)
git commit -m "feat: add support for oneOf schemas"

# Major release (0.2.0 → 1.0.0)
git commit -m "feat!: restructure generator API

BREAKING CHANGE: The generateDartCode function now requires a config object"
```

## Manual Commands

### Check Current Versions
```bash
# Check all package versions
yarn version:check

# Output:
# @dorval/core@0.2.0
# dorval@0.2.0
# @dorval/dio@0.2.0
# @dorval/custom@0.2.0
```

### Sync Versions Manually
```bash
# Sync all packages to root version
yarn version:sync
```

### Test Release (Dry Run)
```bash
# See what would be released without actually releasing
yarn release:dry-run
```

### Manual Release (Not Recommended)
```bash
# Only use if automatic release fails
yarn release
```

## GitHub Actions Workflow

The release happens automatically when you push to `main` or `master`:

1. **Push commits to main**
   ```bash
   git push origin main
   ```

2. **GitHub Actions runs:**
   - Builds the project
   - Runs all tests
   - Runs semantic-release
   - Publishes to npm if version changed
   - Creates GitHub release

3. **Required Secrets:**
   - `NPM_TOKEN`: For publishing to npm
   - `GITHUB_TOKEN`: Automatically provided by GitHub Actions

## Setting Up NPM Token

1. **Get NPM Token:**
   ```bash
   npm login
   npm token create --read-only=false
   ```

2. **Add to GitHub Secrets:**
   - Go to Settings → Secrets → Actions
   - Add `NPM_TOKEN` with your token value

## Troubleshooting

### Version Mismatch
If versions get out of sync:
```bash
# 1. Check current versions
yarn version:check

# 2. Sync all packages
yarn version:sync

# 3. Commit the changes
git add -A
git commit -m "chore: sync package versions"
git push
```

### Failed Release
If release fails:
1. Check GitHub Actions logs
2. Verify NPM_TOKEN is set correctly
3. Ensure you have publish permissions on npm
4. Run dry-run locally to debug:
   ```bash
   GITHUB_TOKEN=your_token NPM_TOKEN=your_token yarn release:dry-run
   ```

### Manual Version Bump (Emergency Only)
```bash
# 1. Update root package.json version
npm version patch  # or minor, major

# 2. Sync all packages
yarn version:sync

# 3. Commit with skip CI to avoid double release
git add -A
git commit -m "chore(release): manual version bump [skip ci]"
git push

# 4. Manually publish to npm
yarn publish:npm
```

## Best Practices

1. **Always use conventional commits** for automatic versioning
2. **Don't manually edit version numbers** - let semantic-release handle it
3. **Test with dry-run** before making breaking changes
4. **Keep commits atomic** - one feature/fix per commit
5. **Write clear commit messages** that explain what changed

## Version History

Check [CHANGELOG.md](./CHANGELOG.md) for version history and release notes.