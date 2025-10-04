#!/bin/bash

# Extract changelog for a specific version from CHANGELOG.md
# Usage: ./extract-changelog.sh v1.0.0

VERSION=$1

# Remove 'v' prefix if present
VERSION_NUMBER=${VERSION#v}

# Extract content between version header and next version or end
awk -v ver="$VERSION_NUMBER" '
  /^## \[/ {
    if (found) exit;
    if ($0 ~ "\\[" ver "\\]") {
      found=1;
      next;
    }
  }
  found && /^## \[/ { exit }
  found && /^---$/ { next }
  found { print }
' CHANGELOG.md
