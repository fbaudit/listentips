import crypto from "crypto";

const ALGORITHM_GCM = "aes-256-gcm";
const ALGORITHM_CBC = "aes-256-cbc";

/**
 * Generate a random 32-byte data encryption key (hex string)
 */
export function generateDataKey(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * SHA256 hash of a key for verification purposes
 */
export function hashKey(keyHex: string): string {
  return crypto.createHash("sha256").update(keyHex).digest("hex");
}

/**
 * Encrypt plaintext using AES-256-GCM (authenticated encryption).
 * Returns "gcm:iv_hex:authTag_hex:encrypted_hex" format string.
 */
export function encryptWithKey(plaintext: string, keyHex: string): string {
  const iv = crypto.randomBytes(12); // 12 bytes for GCM
  const key = Buffer.from(keyHex, "hex");
  const cipher = crypto.createCipheriv(ALGORITHM_GCM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `gcm:${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypt with auto-detection of GCM (new) vs CBC (legacy).
 * GCM format: "gcm:iv_hex:authTag_hex:encrypted_hex"
 * CBC format: "iv_hex:encrypted_hex" (legacy)
 */
export function decryptWithKey(encryptedStr: string, keyHex: string): string {
  const key = Buffer.from(keyHex, "hex");

  // New GCM format
  if (encryptedStr.startsWith("gcm:")) {
    const parts = encryptedStr.split(":");
    if (parts.length !== 4) throw new Error("Invalid GCM encrypted format");
    const [, ivHex, authTagHex, ciphertext] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM_GCM, key, iv);
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    let decrypted = decipher.update(ciphertext, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  // Legacy CBC format: "iv_hex:encrypted_hex"
  const colonIdx = encryptedStr.indexOf(":");
  if (colonIdx === -1) throw new Error("Invalid encrypted format");
  const ivHex = encryptedStr.substring(0, colonIdx);
  const encrypted = encryptedStr.substring(colonIdx + 1);
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM_CBC, key, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Check if a string looks like an encrypted value
 * GCM format: "gcm:iv_hex:authTag_hex:encrypted_hex"
 * CBC format: "iv_hex:encrypted_hex" (32 hex char IV)
 */
export function isEncrypted(value: string): boolean {
  if (!value) return false;
  // GCM format
  if (value.startsWith("gcm:")) return true;
  // Legacy CBC format
  if (!value.includes(":")) return false;
  const colonIdx = value.indexOf(":");
  const ivPart = value.substring(0, colonIdx);
  return ivPart.length === 32 && /^[0-9a-f]+$/.test(ivPart);
}

/**
 * Get the decrypted company data key from DB.
 * Returns null if the company has no encryption key set.
 */
export async function getCompanyDataKey(companyId: string): Promise<string | null> {
  // Dynamic import to avoid circular dependencies
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { decrypt } = await import("@/lib/utils/encryption");

  const supabase = createAdminClient();
  const { data: company } = await supabase
    .from("companies")
    .select("data_encryption_key, data_encryption_iv")
    .eq("id", companyId)
    .single();

  if (!company?.data_encryption_key || !company?.data_encryption_iv) {
    return null;
  }

  try {
    return decrypt(company.data_encryption_key, company.data_encryption_iv);
  } catch {
    return null;
  }
}
