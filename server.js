require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Security middleware
const securityHeaders = require('./middleware/security');
const { apiLimiter, authLimiter, encryptionLimiter } = require('./middleware/rateLimiter');
const { validateTextInput, validateFileInput, validateLoginInput } = require('./middleware/validation');

// Import the compiled C++ addon
let lockstitch;
try {
  lockstitch = require('./build/Release/lockstitch.node');
  console.log('✓ C++ Lockstitch module loaded successfully');
} catch (error) {
  console.error('✗ Failed to load C++ module. Run: npm run build:cpp');
  console.error('Error:', error.message);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-key';
const APP_PASSWORD = process.env.APP_PASSWORD || 'demo123';

// Fix express-rate-limit proxy error in production
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : 'http://localhost:3000',
  credentials: true,
  exposedHeaders: ['Content-Disposition', 'Content-Type']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply security headers
securityHeaders(app);

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend server running' });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  // DEBUG: Log received password and APP_PASSWORD
  console.log('LOGIN DEBUG: received password:', password);
  console.log('LOGIN DEBUG: APP_PASSWORD from env:', APP_PASSWORD);

  if (!password) {
    return res.status(400).json({ error: 'Password required' });
  }

  if (password === APP_PASSWORD) {
    const token = jwt.sign({ authenticated: true }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, message: 'Login successful' });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

// Text Encryption
app.post('/api/encrypt/text', authenticateToken, encryptionLimiter, validateTextInput, (req, res) => {
  try {
    const { text, password } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text required' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Password required' });
    }

    const encrypted = lockstitch.encryptString(text, password);
    res.json({ encryptedText: encrypted });
  } catch (error) {
    console.error('Encryption error:', error);
    res.status(500).json({ error: 'Encryption failed: ' + error.message });
  }
});

// Text Decryption
app.post('/api/decrypt/text', authenticateToken, encryptionLimiter, validateTextInput, (req, res) => {
  try {
    const { encryptedText, password } = req.body;

    if (!encryptedText) {
      return res.status(400).json({ error: 'Encrypted text required' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Password required' });
    }

    const decrypted = lockstitch.decryptString(encryptedText, password);
    res.json({ decryptedText: decrypted });
  } catch (error) {
    console.error('Decryption error:', error);
    res.status(500).json({ error: 'Decryption failed: ' + error.message });
  }
});

// File Encryption
app.post('/api/encrypt/file', authenticateToken, encryptionLimiter, upload.single('file'), validateFileInput, (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'File required' });
    }

    const { password, headSize } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password required' });
    }

    const filePath = req.file.path;
    const headSizeInt = parseInt(headSize) || 0;

    console.log('Encryption request:');
    console.log('  File:', req.file.originalname);
    console.log('  Size:', req.file.size, 'bytes');
    console.log('  Password:', password);
    console.log('  Head size:', headSizeInt);

    // Call C++ encryption
    const result = lockstitch.encryptFile(filePath, password, headSizeInt);
    console.log('Encryption result:', result);

    // Check if encryption was successful
    if (result.includes('Error') || result.includes('error')) {
      // Clean up uploaded file
      fs.unlinkSync(filePath);
      return res.status(500).json({ error: result });
    }

    // The result is the path to the encrypted file
    const encryptedFilePath = result;

    // Generate output filename (keep original name, add .claudo extension)
    const originalName = req.file.originalname;
    const outputFilename = `${originalName.replace(/\.[^.]+$/, '')}.claudo`;
    
    console.log('Sending encrypted file:', outputFilename);

    // Set headers explicitly
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${outputFilename}"`);
    
    // Send the encrypted file
    const fileStream = fs.createReadStream(encryptedFilePath);
    fileStream.pipe(res);
    
    fileStream.on('end', () => {
      // Clean up both files after sending
      try {
        fs.unlinkSync(filePath);
        fs.unlinkSync(encryptedFilePath);
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
    });
    
    fileStream.on('error', (err) => {
      console.error('File stream error:', err);
      try {
        fs.unlinkSync(filePath);
        fs.unlinkSync(encryptedFilePath);
      } catch (cleanupError) {}
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to send encrypted file' });
      }
    });
  } catch (error) {
    console.error('File encryption error:', error);
    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }
    res.status(500).json({ error: 'File encryption failed: ' + error.message });
  }
});

// File Decryption
app.post('/api/decrypt/file', authenticateToken, encryptionLimiter, upload.single('file'), validateFileInput, (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'File required' });
    }

    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password required' });
    }

    const filePath = req.file.path;
    
    console.log('Decryption request:');
    console.log('  File:', req.file.originalname);
    console.log('  Size:', req.file.size, 'bytes');
    console.log('  Password length:', password.length);
    console.log('  Password:', password); // DEBUG: Show actual password

    // Call C++ decryption
    const result = lockstitch.decryptFile(filePath, password);
    
    console.log('Decryption result:', result);

    // Check if decryption was successful
    if (result.includes('Error') || result.includes('error') || result.includes('failed') || result.includes('Failed')) {
      // Clean up uploaded file
      fs.unlinkSync(filePath);
      return res.status(500).json({ error: result });
    }

    // The result is the path to the decrypted file
    const decryptedFilePath = result;

    // Verify the decrypted file exists
    if (!fs.existsSync(decryptedFilePath)) {
      // Clean up uploaded file
      try {
        fs.unlinkSync(filePath);
      } catch (e) {}
      return res.status(500).json({ error: 'Decryption failed - output file not created' });
    }

    // Extract the extension that C++ detected from the decrypted file path
    const decryptedExt = path.extname(decryptedFilePath); // e.g., '.mp4' or '.pdf'
    
    // Generate output filename using the original name + detected extension
    const originalName = req.file.originalname;
    const baseNameWithoutClaudo = originalName.replace(/\.claudo$/i, '');
    const outputFilename = `${baseNameWithoutClaudo}_decrypted${decryptedExt}`;
    
    // Determine MIME type from file extension
    const ext = decryptedExt.substring(1).toLowerCase(); // Remove leading dot
    let mimeType = 'application/octet-stream';
    if (ext === 'mp4') mimeType = 'video/mp4';
    else if (ext === 'mov') mimeType = 'video/quicktime';
    else if (ext === 'avi') mimeType = 'video/x-msvideo';
    else if (ext === 'webm') mimeType = 'video/webm';
    else if (ext === 'pdf') mimeType = 'application/pdf';
    else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
    else if (ext === 'png') mimeType = 'image/png';
    else if (ext === 'gif') mimeType = 'image/gif';
    
    console.log('Sending decrypted file:', outputFilename, 'MIME:', mimeType);

    // Set headers explicitly
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${outputFilename}"`);
    
    // Send the decrypted file
    const fileStream = fs.createReadStream(decryptedFilePath);
    fileStream.pipe(res);
    
    fileStream.on('end', () => {
      // Clean up both files after sending
      try {
        fs.unlinkSync(filePath);
        fs.unlinkSync(decryptedFilePath);
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
    });
    
    fileStream.on('error', (err) => {
      console.error('File stream error:', err);
      try {
        fs.unlinkSync(filePath);
        fs.unlinkSync(decryptedFilePath);
      } catch (cleanupError) {}
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to send decrypted file' });
      }
    });
  } catch (error) {
    console.error('File decryption error:', error);
    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }
    res.status(500).json({ error: 'File decryption failed: ' + error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  🔐 THREEFOLD Encryption Server');
  console.log('═══════════════════════════════════════════');
  console.log(`  Server running on: http://localhost:${PORT}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('═══════════════════════════════════════════');
  console.log('');
});

module.exports = app;
