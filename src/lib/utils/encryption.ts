import crypto from "crypto";

const ALGORITHM_GCM = "aes-256-gcm";
const ALGORITHM_CBC = "aes-256-cbc";

function getEncryptionKey(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is not configured");
  }
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypt using AES-256-GCM (authenticated encryption).
 * Returns { encrypted: "authTag_hex:ciphertext_hex", iv: iv_hex }
 */
export function encrypt(plaintext: string): { encrypted: string; iv: string } {
  const iv = crypto.randomBytes(12); // 12 bytes recommended for GCM
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM_GCM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return { encrypted: `${authTag}:${encrypted}`, iv: iv.toString("hex") };
}

/**
 * Decrypt with auto-detection of GCM (new) vs CBC (legacy).
 * GCM format: iv is 24 hex chars (12 bytes), encrypted contains "authTag:ciphertext"
 * CBC format: iv is 32 hex chars (16 bytes), encrypted is plain hex
 */
export function decrypt(encrypted: string, ivHex: string): string {
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");

  // Detect GCM by IV length (12 bytes = 24 hex) and authTag separator
  if (iv.length === 12 && encrypted.includes(":")) {
    const [authTagHex, ciphertext] = encrypted.split(":");
    const decipher = crypto.createDecipheriv(ALGORITHM_GCM, key, iv);
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    let decrypted = decipher.update(ciphertext, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  // Legacy CBC decryption
  const decipher = crypto.createDecipheriv(ALGORITHM_CBC, key, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
