/**
 * In-memory OTP store: normalized phone -> { code, expiresAt }
 * - 4-digit codes, 3-minute TTL
 * - New request overwrites previous OTP for the same number
 * - No rate limiting (per requirements)
 */

const OTP_STORE = new Map();
const OTP_EXPIRY_MS = 3 * 60 * 1000; // 3 minutes

/**
 * Normalize phone to digits only (used as Map key).
 * @param {string} phone
 * @returns {string}
 */
export function normalizePhone(phone) {
  return String(phone).replace(/\D/g, '');
}

/**
 * @returns {string} 4-digit OTP string
 */
export function generateOtp() {
  const n = Math.floor(1000 + Math.random() * 9000);
  return String(n);
}

/**
 * Save OTP for phone; replaces any existing entry.
 * @param {string} phone - raw or normalized
 * @param {string} code - 4-digit string
 */
export function saveOtp(phone, code) {
  const key = normalizePhone(phone);
  const expiresAt = Date.now() + OTP_EXPIRY_MS;
  OTP_STORE.set(key, { code: String(code), expiresAt });
}

/**
 * Verify OTP: must match and not be expired. Deletes entry on success.
 * @param {string} phone
 * @param {string} otp
 * @returns {boolean}
 */
export function verifyOtp(phone, otp) {
  const key = normalizePhone(phone);
  const entry = OTP_STORE.get(key);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    OTP_STORE.delete(key);
    return false;
  }
  if (String(otp) !== entry.code) {
    return false;
  }
  OTP_STORE.delete(key);
  return true;
}
