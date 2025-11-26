#!/usr/bin/env bash
set -euo pipefail

# Cloudflare Pages deploy helper
# Ensures the deploy step uses the Pages flow (not Workers) even when run from the dashboard.

if [[ ! -d "dist" ]]; then
  echo "🔨 Building site (dist/) before deploy..."
  npm run build
fi

echo "🚀 Deploying dist/ to Cloudflare Pages via wrangler@3 pages deploy"
# --project-name avoids Wrangler auto-detecting a Workers project when misconfigured
npx wrangler@3 pages deploy dist --project-name=insu-report
