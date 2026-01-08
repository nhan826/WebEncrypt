#!/bin/bash

echo "=================================="
echo "  WebEncrypt Setup Script"
echo "=================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "✓ Node.js version: $(node --version)"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed!"
    exit 1
fi

echo "✓ npm version: $(npm --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install node-addon-api

# Build C++ module
echo "🔨 Building C++ encryption module..."
node-gyp configure
node-gyp build

if [ $? -eq 0 ]; then
    echo "✓ C++ module built successfully!"
else
    echo "❌ Failed to build C++ module"
    echo "Try running: xcode-select --install"
    exit 1
fi

cd ..

# Check for .env file
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit .env and set your APP_PASSWORD"
fi

echo ""
echo "=================================="
echo "  ✅ Setup Complete!"
echo "=================================="
echo ""
echo "To start the application:"
echo ""
echo "  Terminal 1: npm run server"
echo "  Terminal 2: npm run dev"
echo ""
echo "Then open: http://localhost:3000"
echo ""
