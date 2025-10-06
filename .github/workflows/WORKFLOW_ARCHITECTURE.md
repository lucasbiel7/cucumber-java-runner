# Publish Workflow Architecture

## 📋 Overview

The publish workflow has been redesigned with **resilience** and **parallel execution** in mind. Instead of a single monolithic job, the workflow is now split into **4 independent jobs** that run in parallel where possible.

## 🏗️ Workflow Structure

```
┌─────────────────┐
│   1. BUILD      │  ← Compile, package, upload artifact
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐ ┌──────────────┐
│2. VSCODE│ │3. OPEN VSX   │  ← Publish in parallel with retry
└────┬────┘ └──────┬───────┘
     │             │
     └──────┬──────┘
            ▼
   ┌─────────────────┐
   │4. CREATE RELEASE│  ← Create GitHub release
   └─────────────────┘
```

## 🎯 Jobs Breakdown

### Job 1: `build` (Build Extension)
**Purpose**: Compile and package the extension once

**Steps**:
1. Checkout code
2. Setup Node.js with npm cache
3. Install dependencies (`npm ci`)
4. Compile TypeScript (`npm run compile`)
5. Extract version from tag
6. Package extension (`.vsix` file)
7. Upload `.vsix` as artifact (shared with other jobs)

**Outputs**:
- `version`: Extracted version number (e.g., `1.0.7`)
- `tag`: Full tag name (e.g., `v1.0.7`)

**Artifact**: `extension-vsix` (the `.vsix` file)

---

### Job 2: `publish-vscode` (Publish to VS Code Marketplace)
**Purpose**: Publish to Microsoft's VS Code Marketplace

**Dependencies**: Requires `build` job to complete first

**Steps**:
1. Download `.vsix` artifact from build job
2. **Check if version already exists** on VS Code Marketplace (idempotency check)
3. Publish to VS Code Marketplace with **retry logic** (only if not already published)

**Version Check**:
- ✅ Queries VS Code Marketplace API to get current published version
- ✅ Compares with target version from tag
- ✅ Skips publication if version already exists
- ✅ Prevents "duplicate version" errors on retry

**Timeout Configuration**:
- ✅ **Timeout**: 10 minutes per publication
- ✅ **Manual retry**: Safe to re-run workflow from GitHub Actions UI

**Why Manual Retry Works Well**:
- Version check prevents duplicate errors
- Idempotent operations (safe to re-run)
- Clear failure visibility in GitHub Actions
- Simple re-run button in UI

---

### Job 3: `publish-openvsx` (Publish to Open VSX Registry)
**Purpose**: Publish to Eclipse Foundation's Open VSX Registry

**Dependencies**: Requires `build` job to complete first

**Steps**:
1. Download `.vsix` artifact from build job
2. **Check if version already exists** on Open VSX Registry (idempotency check)
3. Publish to Open VSX Registry with **retry logic** (only if not already published)

**Version Check**:
- ✅ Queries Open VSX API to get current published version
- ✅ Compares with target version from tag
- ✅ Skips publication if version already exists
- ✅ Handles first-time publication (extension not yet on registry)
- ✅ Prevents "duplicate version" errors on retry

**Timeout Configuration**:
- ✅ **Timeout**: 10 minutes per publication
- ✅ **Manual retry**: Safe to re-run workflow from GitHub Actions UI

**Why Manual Retry Works Well**:
- Version check prevents duplicate errors
- Handles first-time publication (extension not yet on registry)
- Idempotent operations (safe to re-run)
- Clear failure visibility in GitHub Actions

**Note**: Jobs 2 and 3 run **in parallel** for faster execution!

---

### Job 4: `create-release` (Create GitHub Release)
**Purpose**: Create GitHub release with changelog and `.vsix` file

**Dependencies**: Requires ALL previous jobs (`build`, `publish-vscode`, `publish-openvsx`)

**Steps**:
1. Checkout code (for changelog extraction script)
2. Download `.vsix` artifact
3. Extract changelog for this version
4. Generate release notes with installation links
5. Create GitHub release with `.vsix` attachment

**Release Notes Include**:
- Installation instructions for VS Code Marketplace
- Installation instructions for Open VSX Registry
- Installation instructions from VSIX file
- Changelog for this version

---

## ✅ Benefits of This Architecture

### 1. **Resilience**
- ✅ If VS Code Marketplace fails, Open VSX still publishes
- ✅ If Open VSX fails, VS Code Marketplace still publishes
- ✅ Safe manual retry from GitHub Actions UI (idempotent operations)
- ✅ Clear failure isolation - easy to identify which marketplace failed
- ✅ 10-minute timeout per marketplace for better reliability

### 2. **Performance**
- ✅ **Parallel execution**: Both marketplaces publish simultaneously
- ✅ **Faster overall time**: ~2x faster than sequential publishing
- ✅ **Single build**: Extension compiled only once, reused by both publishers

### 3. **Maintainability**
- ✅ **Clear separation**: Each job has a single responsibility
- ✅ **Easy debugging**: Job names clearly indicate what failed
- ✅ **Independent updates**: Can modify one publisher without affecting the other
- ✅ **Artifact reuse**: Build once, publish many times

### 4. **Reliability**
- ✅ **Timeout protection**: Each publish attempt has a 10-minute timeout
- ✅ **Manual retry support**: Safe to re-run workflow from GitHub Actions UI
- ✅ **Graceful degradation**: At least one marketplace publishes even if the other fails
- ✅ **Idempotent operations**: Safe to retry - checks if version already published
- ✅ **No duplicate errors**: Skips publication if version already exists on marketplace

## 🔄 Execution Flow

### Scenario 1: Everything Succeeds ✅
```
1. build (2-3 min)
   ↓
2. publish-vscode (30s) ║ 3. publish-openvsx (30s)  ← Parallel
   ↓                    ║    ↓
   └────────────────────┴────┘
                ↓
4. create-release (30s)

Total time: ~3-4 minutes
```

### Scenario 2: One Marketplace Fails (Manual Retry) ⚠️→✅
```
First run:
1. build (2-3 min)
   ↓
2. publish-vscode (SUCCESS) ║ 3. publish-openvsx (FAIL - network issue)
   ↓ (30s)                   ║    ↓ (timeout)
   └───────────────────────┴────┘
                ↓
4. create-release (BLOCKED)

Manual re-run from GitHub Actions UI:
1. build (2-3 min)
   ↓
2. vscode (CHECK → SKIP) ║ 3. openvsx (CHECK → PUBLISH → SUCCESS)
   ↓ (10s)               ║    ↓ (30s)
   └────────────────────┴────┘
                ↓
4. release (30s)                ✅

Result: Both published successfully with manual retry!
```

### Scenario 3: Version Already Published (Idempotent Retry) ✅
```
1. build (2-3 min)
   ↓
2. publish-vscode (CHECK → ALREADY EXISTS → SKIP) ║ 3. publish-openvsx (CHECK → ALREADY EXISTS → SKIP)
   ↓ (10s)                                        ║    ↓ (10s)
   └────────────────────────────────────────────┴────┘
                ↓
4. create-release (30s)

Total time: ~3 minutes
Result: ✅ All jobs succeed, no duplicate version errors
```

### Scenario 4: One Marketplace Completely Fails ❌
```
1. build (2-3 min)
   ↓
2. publish-vscode (SUCCESS) ║ 3. publish-openvsx (FAIL after 3 attempts)
   ↓                        ║    ↓
   └────────────────────────┴────┘
                ↓
4. create-release (BLOCKED - won't run)

Result: VS Code Marketplace published, but no GitHub release created
Action: Manual investigation needed for Open VSX
```

## 🔧 Configuration

### Timeout Settings
You can adjust timeout for each publish job:

```yaml
- name: Publish to [Marketplace]
  run: npx ... publish
  timeout-minutes: 10          # Max time for publication
```

### Manual Retry
If a publication fails:
1. Go to GitHub Actions → Failed workflow run
2. Click "Re-run failed jobs" or "Re-run all jobs"
3. Version check ensures no duplicate errors
4. Only failed marketplace will publish (successful one skips)

### Making Release Optional
If you want the release to be created even if one marketplace fails, change:

```yaml
create-release:
  needs: [build, publish-vscode, publish-openvsx]
```

To:

```yaml
create-release:
  needs: [build]
  if: always()  # Run even if publish jobs fail
```

## 📊 Monitoring

### Check Job Status
In GitHub Actions UI, you'll see:
- ✅ **build** - Green if compilation succeeded
- ✅ **publish-vscode** - Green if VS Code Marketplace published
- ✅ **publish-openvsx** - Green if Open VSX published
- ✅ **create-release** - Green if GitHub release created

### Troubleshooting Failed Jobs

#### Build Failed
- Check TypeScript compilation errors
- Check npm dependencies
- Verify package.json version is valid

#### publish-vscode Failed
- Verify `VSCE_TOKEN` secret is valid
- Check VS Code Marketplace status
- Review error logs for specific issues

#### publish-openvsx Failed
- Verify `VSX_TOKEN` secret is valid
- Check if namespace exists on Open VSX
- Verify Open VSX Registry is accessible
- For first-time publish, may need manual namespace creation

#### create-release Failed
- Check if changelog extraction script exists
- Verify `.vsix` artifact was uploaded correctly
- Check GitHub token permissions

## 🚀 Usage

### Trigger Workflow
```bash
# Create and push a version tag
git tag v1.0.7
git push origin v1.0.7
```

### Monitor Progress
1. Go to: https://github.com/lucasbiel7/cucumber-java-runner/actions
2. Click on the "Publish Extension" workflow run
3. Monitor each job's progress in real-time

### Verify Publication
After workflow completes:
- **VS Code**: https://marketplace.visualstudio.com/items?itemName=lucasbiel7.cucumber-java-runner
- **Open VSX**: https://open-vsx.org/extension/lucasbiel7/cucumber-java-runner
- **GitHub**: https://github.com/lucasbiel7/cucumber-java-runner/releases

## 📚 References

- [GitHub Actions: Using jobs](https://docs.github.com/en/actions/using-jobs)
- [GitHub Actions: Artifacts](https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts)
- [Retry Action](https://github.com/nick-fields/retry-action)
- [VS Code Publishing](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Open VSX Publishing](https://github.com/eclipse/openvsx/wiki/Publishing-Extensions)

---

**Last Updated**: 2025-10-06
**Version**: 2.0 (Parallel + Retry Architecture)
