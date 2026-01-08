# WebEncrypt - Secure Encryption Web Platform

Modern web application for text and file encryption using the Lockstitch C++ encryption library.

## Features

- 🔐 **Password-protected access** with JWT authentication
- 📝 **Text encryption/decryption** with clean UI
- 📁 **File encryption/decryption** with image preview
- 🎨 **Mac-inspired UI design** with smooth animations
- 🔒 **Secure backend** with C++ native encryption
- ⚡ **Fast processing** with optimized C++ bindings

## Prerequisites

Before running the application, ensure you have:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** or **yarn** package manager
- **Python** (for node-gyp compilation)
- **Xcode Command Line Tools** (macOS): `xcode-select --install`

## Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Add Node.js Native Addon API

```bash
npm install node-addon-api
```

### 3. Build the C++ Module

```bash
cd backend
npm install node-addon-api
node-gyp configure
node-gyp build
cd ..
```

### 4. Set Up Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and set your configuration:

```env
PORT=3001
JWT_SECRET=your-secret-key-here
APP_PASSWORD=your-app-password
NODE_ENV=development
```

## Running the Application

### Development Mode

**Terminal 1 - Backend Server:**
```bash
npm run server
```

**Terminal 2 - Frontend (Next.js):**
```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Mode

```bash
npm run build
npm start
```

Backend runs separately:
```bash
npm run server
```

## Project Structure

```
WebEncrypt/
├── app/                    # Next.js app directory
│   ├── dashboard/         # Main application dashboard
│   ├── login/            # Authentication page
│   └── globals.css       # Global styles
├── components/            # React components
│   ├── TextEncryption.tsx
│   └── FileEncryption.tsx
├── backend/              # Node.js + Express backend
│   ├── cpp/             # C++ Lockstitch source files
│   ├── server.js        # Express server
│   ├── binding.gyp      # Node-gyp configuration
│   └── lockstitch_wrapper.cpp  # C++ to Node.js bridge
├── public/              # Static assets
└── package.json         # Dependencies
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with password

### Text Operations
- `POST /api/encrypt/text` - Encrypt text
- `POST /api/decrypt/text` - Decrypt text

### File Operations
- `POST /api/encrypt/file` - Encrypt file (multipart/form-data)
- `POST /api/decrypt/file` - Decrypt file (multipart/form-data)

All endpoints except `/api/auth/login` require JWT token in `Authorization: Bearer <token>` header.

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Protected API endpoints
- CORS configuration
- Secure file handling with automatic cleanup
- Rate limiting ready (configurable)

## Troubleshooting

### C++ Module Won't Build

1. Ensure Xcode Command Line Tools are installed:
   ```bash
   xcode-select --install
   ```

2. Clear build cache and rebuild:
   ```bash
   cd backend
   rm -rf build
   node-gyp clean
   node-gyp configure
   node-gyp build
   ```

3. Check that `code.txt` exists in `backend/cpp/`

### Backend Connection Error

- Ensure backend server is running on port 3001
- Check `.env` configuration
- Verify `API_URL` in `next.config.js`

### File Upload Issues

- Check `backend/uploads` directory exists and is writable
- Verify file size limits in multer configuration
- Check disk space

## Future Enhancements

- 🎤 Real-time speech-to-text encryption
- 🌐 WebAssembly version for client-side processing
- 📊 Usage analytics dashboard
- 🔄 Batch file processing
- 📱 Mobile-responsive improvements

## License

Proprietary - All rights reserved

## Support

For issues or questions, contact the development team.
