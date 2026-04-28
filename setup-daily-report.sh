#!/bin/bash

# Chess App - Firebase Cloud Functions Setup Script
# This script helps you set up the daily user report

echo "️  Chess App - Daily User Report Setup"
echo "========================================"
echo ""

# Check if Node.js is installed
echo "📦 Checking Node.js installation..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js installed: $NODE_VERSION"
else
    echo "❌ Node.js not found!"
    echo ""
    echo "Please install Node.js first:"
    echo "1. Go to: https://nodejs.org/"
    echo "2. Download LTS version"
    echo "3. Run the installer"
    echo "4. Then run this script again"
    exit 1
fi

# Check if npm is installed
echo "📦 Checking npm installation..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo "✅ npm installed: $NPM_VERSION"
else
    echo "❌ npm not found!"
    echo "Please install Node.js (includes npm)"
    exit 1
fi

# Check if Firebase CLI is installed
echo " Checking Firebase CLI..."
if command -v firebase &> /dev/null; then
    FIREBASE_VERSION=$(firebase --version)
    echo "✅ Firebase CLI installed: $FIREBASE_VERSION"
else
    echo "⚠️  Firebase CLI not found. Installing..."
    npm install -g firebase-tools
    if command -v firebase &> /dev/null; then
        echo "✅ Firebase CLI installed successfully!"
    else
        echo "❌ Failed to install Firebase CLI"
        exit 1
    fi
fi

echo ""
echo "📂 Navigating to functions directory..."
cd "$(dirname "$0")/functions" || exit 1

echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully!"
else
    echo " Failed to install dependencies"
    exit 1
fi

echo ""
echo "⚙️  Configuration Required:"
echo "================================"
echo ""
echo "Before deploying, you need to:"
echo ""
echo "1. Generate a Gmail App Password:"
echo "   - Go to: https://myaccount.google.com/apppasswords"
echo "   - Create app password for 'Chess App Daily Report'"
echo "   - Copy the 16-character password (remove spaces)"
echo ""
echo "2. Update functions/index.js:"
echo "   - Open: functions/index.js"
echo "   - Find line 10: pass: 'YOUR_APP_PASSWORD_HERE'"
echo "   - Replace with your app password"
echo ""
echo "3. Login to Firebase:"
echo "   - Run: firebase login"
echo ""
echo "4. Enable Blaze Plan in Firebase Console:"
echo "   - Go to: https://console.firebase.google.com/"
echo "   - Select project: chess-for-all"
echo "   - Settings → Usage and billing → Upgrade to Blaze"
echo ""
echo "5. Deploy the function:"
echo "   - Run: firebase deploy --only functions"
echo ""
echo " Your daily reports will be sent to: zaptin507@gmail.com"
echo "⏰ Schedule: Every day at 9:00 AM UTC"
echo ""
echo "================================"
echo "✅ Setup preparation complete!"
echo "Follow the steps above to finish configuration."
echo ""