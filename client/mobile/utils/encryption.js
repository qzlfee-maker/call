/**
 * Encryption utilities for secure data handling
 */

export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function generateSecureToken(length = 32) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function encryptLocalStorage(key, data) {
  try {
    const encrypted = btoa(JSON.stringify(data));
    localStorage.setItem(key, encrypted);
    return true;
  } catch (error) {
    console.error('Encryption error:', error);
    return false;
  }
}

export function decryptLocalStorage(key) {
  try {
    const encrypted = localStorage.getItem(key);
    if (!encrypted) return null;
    const decrypted = atob(encrypted);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
}

export function generateVerificationCode(length = 6) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte % 10).join('');
}