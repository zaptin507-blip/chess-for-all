#!/bin/bash
# Download LCZero WASM engine files for browser integration
# Based on frpays/lc0-js (https://github.com/frpays/lc0-js)

set -e

BASE_URL="https://frpays.github.io/lc0-js"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "============================================"
echo "  LCZero Engine Setup for Chess App"
echo "============================================"
echo ""

# Download the main engine script (lc0.js)
if [ ! -f "lc0.js" ]; then
    echo "📥 Downloading lc0.js (engine script)..."
    curl -L -o lc0.js "$BASE_URL/lc0.js" 2>/dev/null || {
        echo "⚠️  Could not download lc0.js from CDN."
        echo "   Please download manually from:"
        echo "   https://github.com/frpays/lc0-js/tree/master/www"
        echo "   Files needed: lc0.js, lc0.wasm, lc0.data"
    }
else
    echo "✅ lc0.js already exists"
fi

# Download the WebAssembly binary
if [ ! -f "lc0.wasm" ]; then
    echo "📥 Downloading lc0.wasm (WebAssembly binary)..."
    curl -L -o lc0.wasm "$BASE_URL/lc0.wasm" 2>/dev/null || {
        echo "⚠️  Could not download lc0.wasm from CDN."
    }
else
    echo "✅ lc0.wasm already exists"
fi

# Download the data file (if it exists)
if [ ! -f "lc0.data" ]; then
    echo "📥 Downloading lc0.data..."
    curl -L -o lc0.data "$BASE_URL/lc0.data" 2>/dev/null || {
        echo "   (lc0.data not found — may not be needed)"
    }
else
    echo "✅ lc0.data already exists"
fi

# Download a small weights file (~6MB, id9155 — 6b/64 net, ~1800 ELO)
if [ ! -f "weights_run1_9155.txt.gz" ]; then
    echo "📥 Downloading network weights (small net, ~6MB)..."
    curl -L -o "weights_run1_9155.txt.gz" \
        "https://storage.lczero.org/files/networks-contrib/t40/9155.txt.gz" 2>/dev/null || {
        echo "⚠️  Could not download weights from LCZero storage."
        echo "   Alternative: download any .txt.gz weights file from:"
        echo "   https://lczero.org/play/networks/bestnets/"
        echo "   and place in /lc0/ as 'weights.txt.gz'"
    }
else
    echo "✅ weights_run1_9155.txt.gz already exists"
fi

echo ""
echo "============================================"
echo "  Setup Complete"
echo "============================================"
echo ""
echo "Files in /lc0/:"
ls -lh "$SCRIPT_DIR"/*.{js,wasm,data,gz} 2>/dev/null || echo "  (some files missing — see warnings above)"
echo ""
echo "Next steps:"
echo "  1. Add tensorflow.js CDN to index.html:"
echo "     <script src='https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4'></script>"
echo "  2. Add lc0_loader.js to index.html:"
echo "     <script src='lc0/lc0_loader.js'></script>"
echo "  3. The engine will auto-initialize via initLCZero() in app.js"
echo ""
