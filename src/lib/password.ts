import "server-only";

import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";

// Unambiguous alphabet — no 0/O/1/I/l — so users can read their initial
// password off an SMS without second-guessing lookalike characters.
const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
const INITIAL_PASSWORD_LEN = 10;
const BCRYPT_COST = 12;
export const MIN_PASSWORD_LEN = 8;
export const MAX_PASSWORD_LEN = 72;
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 15;

export function generateInitialPassword(): string {
  let out = "";
  for (let i = 0; i < INITIAL_PASSWORD_LEN; i++) {
    out += PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)];
  }
  return out;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

export function isAcceptablePassword(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  if (raw.length < MIN_PASSWORD_LEN || raw.length > MAX_PASSWORD_LEN) return false;
  return true;
}
