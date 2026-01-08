// Input validation and sanitization
const validator = require('validator');

const validateTextInput = (req, res, next) => {
  const { text, encryptedText } = req.body;
  const textToValidate = text || encryptedText;

  if (!textToValidate || typeof textToValidate !== 'string') {
    return res.status(400).json({ error: 'Invalid text input' });
  }

  // Check length limits (prevent DOS)
  if (textToValidate.length > 1000000) { // 1MB limit
    return res.status(400).json({ error: 'Text too large. Maximum 1MB.' });
  }

  next();
};

const validateFileInput = (req, res, next) => {
  const { password } = req.body;

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Invalid password' });
  }

  // Sanitize password (basic check)
  if (password.length > 128) {
    return res.status(400).json({ error: 'Password too long. Maximum 128 characters.' });
  }

  if (req.body.headSize !== undefined) {
    const headSize = parseInt(req.body.headSize);
    if (isNaN(headSize) || headSize < 0 || headSize > 1000000) {
      return res.status(400).json({ error: 'Invalid header size value' });
    }
  }

  next();
};

const validateLoginInput = (req, res, next) => {
  const { password } = req.body;

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password required' });
  }

  if (password.length > 128) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  next();
};

module.exports = {
  validateTextInput,
  validateFileInput,
  validateLoginInput
};
