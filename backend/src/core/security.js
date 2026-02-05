import { randomBytes, scrypt as rawScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(rawScrypt);
const KEY_LENGTH = 64;

function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

async function hashPassword(password) {
  const normalized = String(password ?? "");
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scrypt(normalized, salt, KEY_LENGTH);
  return `${salt}:${Buffer.from(derivedKey).toString("hex")}`;
}

async function verifyPassword(password, hashedValue) {
  const [salt, hashHex] = String(hashedValue ?? "").split(":");
  if (!salt || !hashHex) {
    return false;
  }

  const derivedKey = await scrypt(String(password ?? ""), salt, KEY_LENGTH);
  const storedKey = Buffer.from(hashHex, "hex");
  return (
    storedKey.length === derivedKey.length &&
    timingSafeEqual(storedKey, Buffer.from(derivedKey))
  );
}

export { normalizeEmail, hashPassword, verifyPassword };
