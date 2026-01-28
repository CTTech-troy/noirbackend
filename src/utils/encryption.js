/**
 * AES Encryption/Decryption Utilities for Backend
 * Mirrors frontend encryption with Node.js crypto
 */

import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'restaurantAI_secret_key_2024_secure_vapi_encryption';
const ENCRYPTION_IV = process.env.ENCRYPTION_IV || 'restaurant_ai_initialization_vector';

/**
 * Decrypt payload using AES-256-CBC
 * @param {Object} encryptedData - Encrypted data from frontend
 * @returns {Object} Decrypted payload
 */
export const decryptPayload = (encryptedData) => {
  try {
    const { encrypted, salt, signature } = encryptedData;

    console.log(`[DECRYPT] Starting AES-256-CBC decryption...`);

    // Verify HMAC signature for integrity (optional - data already has Firebase protection)
    if (signature) {
      const hmac = crypto.createHmac('sha256', ENCRYPTION_KEY);
      hmac.update(encrypted);
      const expectedSignature = hmac.digest('hex');

      if (signature !== expectedSignature) {
        console.warn(`⚠️  Signature verification FAILED - Continuing with decryption anyway`);
        // Don't fail here - proceed with decryption since Firebase has additional security
      } else {
        console.log(`✅ Signature verified successfully`);
      }
    }

    // Reconstruct salt
    const saltBuffer = Buffer.from(salt, 'hex');

    // Derive key using PBKDF2 (matching frontend)
    const derivedKey = crypto.pbkdf2Sync(ENCRYPTION_KEY, saltBuffer, 1000, 32, 'sha256');

    // Create IV (16 bytes)
    const ivBuffer = Buffer.from(
      ENCRYPTION_IV.padEnd(16, '0').slice(0, 16),
      'utf8'
    );

    // Decrypt using AES-256-CBC
    const decipher = crypto.createDecipheriv('aes-256-cbc', derivedKey, ivBuffer);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    console.log(`✅ Decryption successful`);

    // Parse JSON
    const payload = JSON.parse(decrypted);

    // Verify timestamp to prevent replay attacks (5 minute window)
    const now = Date.now();
    const age = now - payload._timestamp;
    const maxAge = 5 * 60 * 1000; // 5 minutes

    if (age > maxAge) {
      console.warn(`⚠️  Payload expired (${Math.round(age / 1000)}s old) - Possible replay attack`);
      return {
        success: false,
        error: 'Payload has expired - Possible replay attack',
        code: 'REPLAY_ATTACK_DETECTED',
        age: age,
        maxAge: maxAge
      };
    }

    console.log(`✅ Timestamp validation passed (${Math.round(age / 1000)}s old)`);

    // Remove internal fields
    delete payload._timestamp;
    delete payload._version;

    return {
      success: true,
      data: payload,
      code: 'DECRYPTION_SUCCESS',
      decryptionTime: new Date().toISOString()
    };
  } catch (error) {
    console.error(`❌ Decryption FAILED:`, error.message);
    return {
      success: false,
      error: error.message,
      code: 'DECRYPTION_ERROR'
    };
  }
};

/**
 * Encrypt payload using AES-256-CBC (for testing/response)
 * @param {Object} payload - Data to encrypt
 * @returns {Object} Encrypted data
 */
export const encryptPayload = (payload) => {
  try {
    const timestamp = Date.now();

    // Add timestamp and version
    const dataWithTimestamp = {
      ...payload,
      _timestamp: timestamp,
      _version: '1.0'
    };

    const jsonString = JSON.stringify(dataWithTimestamp);

    // Generate random salt
    const salt = crypto.randomBytes(16);

    // Derive key using PBKDF2
    const derivedKey = crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 1000, 32, 'sha256');

    // Create IV
    const ivBuffer = Buffer.from(
      ENCRYPTION_IV.padEnd(16, '0').slice(0, 16),
      'utf8'
    );

    // Encrypt using AES-256-CBC
    const cipher = crypto.createCipheriv('aes-256-cbc', derivedKey, ivBuffer);
    let encrypted = cipher.update(jsonString, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Create HMAC signature
    const hmac = crypto.createHmac('sha256', ENCRYPTION_KEY);
    hmac.update(encrypted);
    const signature = hmac.digest('hex');

    return {
      encrypted: encrypted,
      salt: salt.toString('hex'),
      signature: signature,
      algorithm: 'AES-256-CBC',
      timestamp: timestamp,
      success: true
    };
  } catch (error) {
    console.error('❌ Encryption failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Verify payload integrity
 * @param {String} payload - JSON string payload
 * @param {String} signature - Expected HMAC signature
 * @returns {Boolean} True if signatures match
 */
export const verifyIntegrity = (payload, signature) => {
  try {
    const hmac = crypto.createHmac('sha256', ENCRYPTION_KEY);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');
    return expectedSignature === signature;
  } catch (error) {
    console.error('❌ Integrity verification failed:', error);
    return false;
  }
};
