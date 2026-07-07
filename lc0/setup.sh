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

# Download stronger network weights (20b protobuf, ~44MB, ~3400+ ELO)
# Compatible networks: weights_32195.dat.gz (strongest), weights_11248.dat.gz
if [ ! -f "weights_320b_32195.dat.gz" ]; then
    echo ""
    echo "📥 Downloading strong LCZero network (20b protobuf, 44MB)..."
    echo "   This is the strongest net supported by lc0-js (~3400+ ELO)"
    curl -L -o "weights_320b_32195.dat.gz" "$BASE_URL/weights_32195.dat.gz" 2>/dev/null || {
        echo "⚠️  Download failed. Falling back to small net (6MB, ~1800 ELO)..."
        curl -L -o "weights_run1_9155.txt.gz" "$BASE_URL/weights_9155.txt.gz" 2>/dev/null
    }
else
    echo "✅ weights_320b_32195.dat.gz already exists"
fi

echo ""
echo "============================================"
echo "  Setup Complete"
echo "============================================"
echo ""
echo "Files in /lc0/:"
ls -lh "$SCRIPT_DIR"/*.{js,wasm,data,gz} 2>/dev/null || echo "  (some files missing — see warnings above)"
echo ""
echo "The app.js uses 'weights_320b_32195.dat.gz' by default."
echo "To switch nets, edit app.js line: const weightsUrl = ..."
echo ""
