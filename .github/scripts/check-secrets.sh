#!/bin/bash

# Script to help verify secrets configuration
# Note: This script cannot actually read secrets, but provides a checklist

echo "🔍 Checking GitHub Actions Setup"
echo "=================================="
echo ""

echo "📋 Required Secrets Checklist:"
echo ""
echo "1. VSCE_TOKEN"
echo "   Purpose: Publish extension to VS Code Marketplace"
echo "   Scope: VS Code Marketplace publisher token"
echo "   Status: ⚠️  Cannot verify (secret)"
echo ""

echo "2. PAT_TOKEN"
echo "   Purpose: Allow automated tags to trigger publish workflow"
echo "   Scope: repo + workflow"
echo "   Status: ⚠️  Cannot verify (secret)"
echo "   Documentation: See .github/SETUP_PAT.md"
echo ""

echo "3. GITHUB_TOKEN"
echo "   Purpose: Standard GitHub Actions token"
echo "   Scope: Automatically provided"
echo "   Status: ✅ Automatically available"
echo ""

echo "=================================="
echo ""
echo "🔧 To Configure Secrets:"
echo "1. Go to: https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/settings/secrets/actions"
echo "2. Add 'VSCE_TOKEN' if not already configured"
echo "3. Add 'PAT_TOKEN' following instructions in .github/SETUP_PAT.md"
echo ""

echo "📝 Current package.json version:"
VERSION=$(node -p "require('./package.json').version" 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "   v$VERSION"
else
    echo "   ⚠️  Could not read package.json (make sure you're in the project root)"
fi
echo ""

echo "🏷️  Existing tags:"
git tag -l | tail -5 | sed 's/^/   /'
echo ""

echo "✅ Next Steps:"
echo "1. Ensure PAT_TOKEN is configured (see .github/SETUP_PAT.md)"
echo "2. Update version in package.json"
echo "3. Update CHANGELOG.md"
echo "4. Commit and push to main branch"
echo "5. Workflow will automatically create tag and trigger publish"
