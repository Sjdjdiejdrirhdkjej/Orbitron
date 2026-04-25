#!/bin/bash
# Pre-deployment script to ensure .replit file is accessible
# This runs before the deployment system reads .replit

set -e

# Verify .replit exists and is readable
if [ ! -f .replit ]; then
    echo ERROR: .replit file not found in workspace
    exit 1
fi

# Ensure proper permissions
chmod 644 .replit

# Verify it's readable
if ! head -1 .replit > /dev/null 2>&1; then
    echo ERROR: .replit file is not readable
    exit 1
fi

echo SUCCESS: .replit file verified and accessible

# Copy to a backup location just in case
cp .replit .replit.backup 2>/dev/null || true

exit 0