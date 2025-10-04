# Setup Personal Access Token (PAT) for Automated Releases

## Problem

When GitHub Actions creates a tag using the default `GITHUB_TOKEN`, it doesn't trigger other workflows (like the publish workflow). This is a security feature to prevent recursive workflow triggers.

## Solution

Use a Personal Access Token (PAT) with appropriate permissions to create tags that will trigger the publish workflow.

## Steps to Configure PAT_TOKEN

### 1. Create a Personal Access Token

1. Go to **GitHub Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
   - Direct link: https://github.com/settings/tokens

2. Click **"Generate new token"** → **"Generate new token (classic)"**

3. Configure the token:
   - **Note**: `cucumber-java-runner-releases` (or any descriptive name)
   - **Expiration**: Choose your preferred duration (e.g., 90 days, 1 year, or no expiration)
   - **Select scopes**:
     - ✅ **repo** (Full control of private repositories)
       - This includes `repo:status`, `repo_deployment`, `public_repo`, `repo:invite`, `security_events`
     - ✅ **workflow** (Update GitHub Action workflows)

4. Click **"Generate token"** and **copy the token immediately** (you won't be able to see it again!)

### 2. Add Token to Repository Secrets

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Configure the secret:
   - **Name**: `PAT_TOKEN`
   - **Value**: Paste the token you copied in step 1
5. Click **"Add secret"**

### 3. Verify Configuration

After adding the secret:

1. Make a commit that changes the version in `package.json`
2. Push to `main` branch
3. The `Auto Tag Release` workflow will:
   - Create a tag using the PAT_TOKEN
   - This tag creation will trigger the `Publish Extension` workflow
4. Check the **Actions** tab to verify both workflows run successfully

## How It Works

The workflow now uses:

```yaml
token: ${{ secrets.PAT_TOKEN || secrets.GITHUB_TOKEN }}
```

This means:
- **If `PAT_TOKEN` is configured**: Uses the PAT (triggers publish workflow) ✅
- **If `PAT_TOKEN` is not configured**: Falls back to `GITHUB_TOKEN` (won't trigger publish workflow) ⚠️

## Security Notes

- ⚠️ **Keep your PAT secure** - Never commit it to the repository
- 🔒 **Use repository secrets** - They are encrypted and only accessible to workflows
- 🔄 **Set expiration** - Consider setting an expiration date and renewing periodically
- 📝 **Minimal permissions** - Only grant the `repo` and `workflow` scopes needed

## Troubleshooting

### Publish workflow still not triggering?

1. **Verify the secret name**: Must be exactly `PAT_TOKEN` (case-sensitive)
2. **Check token permissions**: Ensure both `repo` and `workflow` scopes are enabled
3. **Check token expiration**: Token might have expired
4. **Review workflow logs**: Check the "Auto Tag Release" workflow logs for errors

### How to test without publishing?

You can manually run the workflow from the Actions tab:
1. Go to **Actions** → **Auto Tag Release**
2. Click **"Run workflow"**
3. This will test the tag creation without needing a commit

## Alternative: Combined Workflow

If you prefer not to use a PAT, you can combine both workflows into one:

```yaml
name: Release and Publish

on:
  push:
    branches:
      - main

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      # Check version, create tag, package, and publish all in one workflow
      # (Not recommended - less modular and harder to debug)
```

However, using a PAT is the **recommended approach** as it:
- Keeps workflows modular and maintainable
- Allows independent testing of each workflow
- Follows GitHub Actions best practices
