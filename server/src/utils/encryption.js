'use strict';

/**
 * encryption.js — AES-256-GCM encryption/decryption helpers.
 *
 * Used to encrypt sensitive OAuth tokens (accessToken, refreshToken) at rest
 * before they are persisted to MongoDB.
 *
 * Required env var:
 *   ENCRYPTION_KEY — A 64-character hex string (32 bytes). Generate with:
 *     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * Algorithm: AES-256-GCM
 *   - Authenticated encryption (prevents tampering)
 *   - Random IV per encryption (prevents ciphertext patterns)
 *   - Auth tag appended to output (ensures integrity on decrypt)
 *
 * Output format (stored as a single string):
 *   <iv_hex>:<authTag_hex>:<ciphertext_hex>
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12; // 96-bit IV — recommended for GCM
const AUTH_TAG_BYTES = 16;

/**
 * Derive the 32-byte encryption key from the ENCRYPTION_KEY env var.
 * Lazily resolved so the module can be required without the var being set
 * (will throw only when encrypt/decrypt is actually called).
 */
function getKey() {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      '[encryption] ENCRYPTION_KEY env var is not set. ' +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  if (raw.length !== 64) {
    throw new Error(
      `[encryption] ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Got ${raw.length} chars.`
    );
  }
  return Buffer.from(raw, 'hex');
}

/**
 * Encrypt a plaintext string.
 * @param {string} plaintext
 * @returns {string} "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 */
function encrypt(plaintext) {
  if (typeof plaintext !== 'string') {
    throw new TypeError('[encryption] encrypt() expects a string');
  }
  const key = getKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt a ciphertext string produced by encrypt().
 * @param {string} ciphertext "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 * @returns {string} original plaintext
 */
function decrypt(ciphertext) {
  if (typeof ciphertext !== 'string') {
    throw new TypeError('[encryption] decrypt() expects a string');
  }
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('[encryption] Invalid ciphertext format — expected iv:authTag:data');
  }

  const key = getKey();
  const [ivHex, authTagHex, dataHex] = parts;

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encryptedData = Buffer.from(dataHex, 'hex');

  if (iv.length !== IV_BYTES) {
    throw new Error(`[encryption] Invalid IV length: expected ${IV_BYTES}, got ${iv.length}`);
  }
  if (authTag.length !== AUTH_TAG_BYTES) {
    throw new Error(`[encryption] Invalid auth tag length: expected ${AUTH_TAG_BYTES}, got ${authTag.length}`);
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(encryptedData),
    decipher.final(),
  ]).toString('utf8');
}

module.exports = { encrypt, decrypt };
