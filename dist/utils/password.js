"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
const crypto_1 = require("crypto");
// Hash a plaintext password into a "salt:hash" string using scrypt.
function hashPassword(plain) {
    const salt = (0, crypto_1.randomBytes)(16).toString("hex");
    const hash = (0, crypto_1.scryptSync)(plain, salt, 64).toString("hex");
    return `${salt}:${hash}`;
}
// Constant-time verify of a plaintext password against a stored "salt:hash".
function verifyPassword(plain, stored) {
    if (!stored)
        return false;
    const [salt, key] = stored.split(":");
    if (!salt || !key)
        return false;
    const hashed = (0, crypto_1.scryptSync)(plain, salt, 64);
    const keyBuffer = Buffer.from(key, "hex");
    return keyBuffer.length === hashed.length && (0, crypto_1.timingSafeEqual)(keyBuffer, hashed);
}
