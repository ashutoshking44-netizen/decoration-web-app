@echo off
title Decoration Dashboard - Live WhatsApp Share Link
echo ==================================================================
echo         STARTING CLOUDFLARE TUNNEL FOR PORT 8080...
echo ==================================================================
echo.
npx --yes cloudflared tunnel --protocol http2 --url http://localhost:8080
pause
