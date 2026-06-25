#!/usr/bin/env bash
# SessionStart 准备脚本: 保证每个会话(含 web 多会话并行)环境一致.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -d node_modules ]; then
  echo "[setup] installing deps..."
  npm ci 2>/dev/null || npm install
fi
echo "[setup] ready. gates: npm run typecheck | npm test | npm run build"
