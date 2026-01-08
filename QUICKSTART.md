# Quick Start Guide

## For First Time Users

### 1. Check Prerequisites

You need Node.js installed. Check by running:
```bash
node --version
```

If you don't have Node.js, install it from [nodejs.org](https://nodejs.org/)

### 2. Install Everything

Open Terminal in the WebEncrypt folder and run:
```bash
npm install
```

### 3. Build the C++ Encryption Module

```bash
cd backend
npm install node-addon-api
node-gyp configure
node-gyp build
cd ..
```

If you get errors, install Xcode Command Line Tools:
```bash
xcode-select --install
```

### 4. Set Up Your Password

```bash
cp .env.example .env
nano .env
```

Change `APP_PASSWORD=your-app-password-here` to your desired password.

### 5. Start the Application

**Open TWO terminal windows:**

**Terminal 1 - Start Backend:**
```bash
npm run server
```

Wait for: `Server running on: http://localhost:3001`

**Terminal 2 - Start Frontend:**
```bash
npm run dev
```

Wait for: `Ready on http://localhost:3000`

### 6. Open in Browser

Go to: [http://localhost:3000](http://localhost:3000)

Login with the password you set in step 4.

---

## Common Issues

**"Command not found: npx"**
- Install Node.js from nodejs.org

**"C++ module won't build"**
```bash
xcode-select --install
cd backend
rm -rf build
node-gyp clean
node-gyp configure
node-gyp build
```

**"Backend connection error"**
- Make sure backend is running (Terminal 1)
- Check it's on port 3001

**"code.txt not found"**
```bash
cp ../CryptoApp/Setup/code.txt backend/cpp/
```

---

## What You Can Do

✅ **Text Encryption** - Encrypt/decrypt messages
✅ **File Encryption** - Encrypt/decrypt images and files
✅ **Password Protected** - Only you can access
✅ **Secure** - Uses C++ encryption backend

---

## Stop the Application

Press `Ctrl+C` in both terminal windows.

---

## Need Help?

Check the full README.md for detailed information.
