#!/bin/bash
set -e

# Ensure .replit file is accessible for deployment system
# This fixes timing issues where deployment tries to read .replit before workspace is ready
if [ -f ".replit" ]; then
    chmod 644 .replit
    chown runner:runner .replit 2>/dev/null || true
    echo "Verified .replit file accessibility"
fi

npm install --no-audit --no-fund
