// Cloudflare Workers Web Crypto currently caps PBKDF2 at 100,000 iterations.
const PASSWORD_ITERATIONS = 100_000;
const PASSWORD_ALGORITHM = "PBKDF2-SHA-256";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function utf8(value: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(value);
}

function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(length));
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function pbkdf2(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey("raw", utf8(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    256,
  );
  return bytesToBase64(new Uint8Array(bits));
}

export interface PasswordDigest {
  hash: string;
  salt: string;
  algorithm: typeof PASSWORD_ALGORITHM;
  iterations: number;
}

export async function hashPassword(password: string): Promise<PasswordDigest> {
  const salt = randomBytes(16);
  return {
    hash: await pbkdf2(password, salt, PASSWORD_ITERATIONS),
    salt: bytesToBase64(salt),
    algorithm: PASSWORD_ALGORITHM,
    iterations: PASSWORD_ITERATIONS,
  };
}

export async function verifyPassword(
  password: string,
  digest: { hash: string; salt: string; algorithm: string; iterations: number },
): Promise<boolean> {
  if (digest.algorithm !== PASSWORD_ALGORITHM || digest.iterations < 100_000) return false;
  const candidate = await pbkdf2(password, base64ToBytes(digest.salt), digest.iterations);
  return constantTimeEqual(candidate, digest.hash);
}

export function randomToken(size = 32): string {
  return bytesToBase64(randomBytes(size)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export async function sha256(value: string): Promise<string> {
  return bytesToBase64(new Uint8Array(await crypto.subtle.digest("SHA-256", utf8(value))));
}

export async function hmacSha256(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    utf8(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return bytesToBase64(new Uint8Array(await crypto.subtle.sign("HMAC", key, utf8(value))));
}

async function encryptionKey(base64Key: string): Promise<CryptoKey> {
  const keyBytes = base64ToBytes(base64Key);
  if (keyBytes.byteLength !== 32) throw new Error("CREDENTIALS_ENCRYPTION_KEY 必须是 32 字节 Base64 密钥");
  return crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptCredentials(
  value: Record<string, string>,
  base64Key: string,
): Promise<{ encrypted: string; iv: string }> {
  const iv = randomBytes(12);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await encryptionKey(base64Key),
    utf8(JSON.stringify(value)),
  );
  return { encrypted: bytesToBase64(new Uint8Array(encrypted)), iv: bytesToBase64(iv) };
}

export async function decryptCredentials(
  encrypted: string,
  iv: string,
  base64Key: string,
): Promise<Record<string, string>> {
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(iv) },
    await encryptionKey(base64Key),
    base64ToBytes(encrypted),
  );
  const parsed: unknown = JSON.parse(new TextDecoder().decode(decrypted));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("解密凭据格式无效");
  return parsed as Record<string, string>;
}
