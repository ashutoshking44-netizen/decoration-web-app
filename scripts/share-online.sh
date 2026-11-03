#!/usr/bin/env bash
set -e

PORT="${PORT:-8080}"

echo "=================================================================="
echo "       STARTING CLOUDFLARE LIVE SHARE TUNNEL (PORT ${PORT})...     "
echo "=================================================================="

if ! command -v cloudflared &> /dev/null; then
  echo "cloudflared not found. Installing via brew..."
  brew install cloudflared
fi

echo "Connecting to your project on port ${PORT}..."
cloudflared tunnel --url "http://127.0.0.1:${PORT}"

