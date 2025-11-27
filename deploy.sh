#!/bin/bash
# Cloudflare Pages Deployment Script
# Usage: CLOUDFLARE_API_TOKEN="your-token" ./deploy.sh

set -e

echo "🚀 Starting Cloudflare Pages deployment..."
echo ""

# Check if API token is set
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "❌ Error: CLOUDFLARE_API_TOKEN environment variable is not set"
    echo ""
    echo "📝 How to get your API token:"
    echo "   1. Visit: https://dash.cloudflare.com/profile/api-tokens"
    echo "   2. Click 'Create Token'"
    echo "   3. Use 'Edit Cloudflare Workers' template"
    echo "   4. Copy the token"
    echo ""
    echo "🔐 Then run:"
    echo "   export CLOUDFLARE_API_TOKEN=\"your-token-here\""
    echo "   ./deploy.sh"
    echo ""
    exit 1
fi

# Build the application
echo "📦 Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build completed"
echo ""

# Deploy to Cloudflare Pages
echo "☁️  Deploying to Cloudflare Pages..."
npx wrangler pages deploy dist --project-name=insureport

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo "🌐 Production: https://insureport.pages.dev"
    echo ""
else
    echo ""
    echo "❌ Deployment failed"
    exit 1
fi
