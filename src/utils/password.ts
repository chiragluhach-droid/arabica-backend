import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

// Hash a plaintext password into a "salt:hash" string using scrypt.
export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

// Constant-time verify of a plaintext password against a stored "salt:hash".
export function verifyPassword(plain: string, stored?: string | null): boolean {
  if (!stored) return false;
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const hashed = scryptSync(plain, salt, 64);
  const keyBuffer = Buffer.from(key, "hex");
  return keyBuffer.length === hashed.length && timingSafeEqual(keyBuffer, hashed);
}
