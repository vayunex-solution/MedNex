'use strict';

const crypto = require('crypto');

// Enforces 32-byte key
const ENCRYPTION_KEY = (process.env.ENCRYPTION_KEY || 'nex_encryption_key_default_32bytes_key!').slice(0, 32).padEnd(32, '0');
const IV_LENGTH = 16;

const encrypt = (text) => {
  if (!text) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

const decrypt = (text) => {
  if (!text) return null;
  try {
    const textParts = text.split(':');
    if (textParts.length < 2) return text; // fallback for plain values if not encrypted
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    return text; // fallback if decryption fails
  }
};

module.exports = { encrypt, decrypt };
