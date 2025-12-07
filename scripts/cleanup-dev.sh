#!/bin/bash

# Cleanup script for Next.js dev server
# Kills any running Next.js processes and removes lock files

echo "🧹 Cleaning up Next.js dev server..."

# Kill processes on ports 3000 and 3001
echo "Killing processes on ports 3000 and 3001..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

# Kill any Next.js dev processes
echo "Killing Next.js dev processes..."
ps aux | grep -i "next dev" | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null || true

# Remove lock files
echo "Removing lock files..."
find .next -name "lock" -type f -delete 2>/dev/null || true
rm -f .next/dev/lock 2>/dev/null || true

echo "✅ Cleanup complete!"
echo ""
echo "You can now run: npm run dev"
