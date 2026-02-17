import crypto from 'crypto';

const SALT_LEN = 16;
const KEY_LEN = 64;
const ITERATIONS = 100000;
const DIGEST = 'sha512';

export function hashPassword(plain: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(SALT_LEN).toString('hex');
  const hash = crypto.pbkdf2Sync(plain, salt, ITERATIONS, KEY_LEN, DIGEST).toString('hex');
  return { salt, hash };
}

export function verifyPassword(plain: string, salt: string, hash: string): boolean {
  const derived = crypto.pbkdf2Sync(plain, salt, ITERATIONS, KEY_LEN, DIGEST).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(derived, 'hex'));
}
