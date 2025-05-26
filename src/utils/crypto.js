const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class CryptoUtils {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32;
    this.ivLength = 16;
    this.tagLength = 16;
    this.saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  }

  // Generate random string
  generateRandomString(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  // Generate UUID
  generateUUID() {
    return crypto.randomUUID();
  }

  // Hash password using bcrypt
  async hashPassword(password) {
    try {
      return await bcrypt.hash(password, this.saltRounds);
    } catch (error) {
      throw new Error('Password hashing failed');
    }
  }

  // Verify password
  async verifyPassword(password, hashedPassword) {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      throw new Error('Password verification failed');
    }
  }

  // Encrypt data
  encrypt(text, key = null) {
    try {
      const encryptionKey = key || Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipher(this.algorithm, encryptionKey, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex')
      };
    } catch (error) {
      throw new Error('Encryption failed');
    }
  }

  // Decrypt data
  decrypt(encryptedData, key = null) {
    try {
      const encryptionKey = key || Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const tag = Buffer.from(encryptedData.tag, 'hex');
      
      const decipher = crypto.createDecipher(this.algorithm, encryptionKey, iv);
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error('Decryption failed');
    }
  }

  // Generate JWT token
  generateJWT(payload, expiresIn = null) {
    try {
      const secret = process.env.JWT_SECRET;
      const options = {
        expiresIn: expiresIn || process.env.JWT_EXPIRES_IN || '7d'
      };
      
      return jwt.sign(payload, secret, options);
    } catch (error) {
      throw new Error('JWT generation failed');
    }
  }

  // Verify JWT token
  verifyJWT(token) {
    try {
      const secret = process.env.JWT_SECRET;
      return jwt.verify(token, secret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  // Generate refresh token
  generateRefreshToken(payload) {
    try {
      const secret = process.env.JWT_REFRESH_SECRET;
      const options = {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
      };
      
      return jwt.sign(payload, secret, options);
    } catch (error) {
      throw new Error('Refresh token generation failed');
    }
  }

  // Verify refresh token
  verifyRefreshToken(token) {
    try {
      const secret = process.env.JWT_REFRESH_SECRET;
      return jwt.verify(token, secret);
    } catch (error) {
      throw new Error('Refresh token verification failed');
    }
  }

  // Generate verification code
  generateVerificationCode(length = 6) {
    const digits = '0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += digits[Math.floor(Math.random() * digits.length)];
    }
    return code;
  }

  // Generate secure token for email verification, password reset, etc.
  generateSecureToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Hash data using SHA256
  sha256Hash(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // Create HMAC signature
  createHMAC(data, secret = null) {
    const key = secret || process.env.JWT_SECRET;
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  }

  // Verify HMAC signature
  verifyHMAC(data, signature, secret = null) {
    const expectedSignature = this.createHMAC(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  // Generate wallet address from public key (simplified)
  generateWalletAddress(publicKey) {
    const hash = crypto.createHash('sha256').update(publicKey).digest();
    return '0x' + hash.slice(-20).toString('hex');
  }
}

// Create singleton instance
const cryptoUtils = new CryptoUtils();

module.exports = cryptoUtils;
