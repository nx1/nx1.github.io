#!/usr/bin/env bash
PORT=${1:-8000}
WSL_IP=$(hostname -I 2>/dev/null | awk '{print $1}')

echo "========================================================"
echo " Starting local HTTP server for Psyscores & Mosaic Lab"
echo " Open in your Windows browser:"
echo " -> http://localhost:$PORT/art/"
if [ -n "$WSL_IP" ]; then
    echo " -> http://$WSL_IP:$PORT/art/  (Direct WSL IP)"
fi
echo " Press Ctrl+C to stop."
echo "========================================================"
python3 -m http.server "$PORT" --directory "$(dirname "$0")" --bind 0.0.0.0
