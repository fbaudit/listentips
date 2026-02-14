import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";

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
 * Encrypt plaintext using a company-specific key
 * Returns "iv_hex:encrypted_hex" format string
 */
export function encryptWithKey(plaintext: string, keyHex: string): string {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(keyHex, "hex");
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt an "iv_hex:encrypted_hex" format string using a company-specific key
 */
export function decryptWithKey(encryptedStr: string, keyHex: string): string {
  const colonIdx = encryptedStr.indexOf(":");
  if (colonIdx === -1) throw new Error("Invalid encrypted format");
  const ivHex = encryptedStr.substring(0, colonIdx);
  const encrypted = encryptedStr.substring(colonIdx + 1);
  const key = Buffer.from(keyHex, "hex");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Check if a string looks like an encrypted value (iv_hex:encrypted_hex format)
 */
export function isEncrypted(value: string): boolean {
  if (!value || !value.includes(":")) return false;
  const colonIdx = value.indexOf(":");
  const ivPart = value.substring(0, colonIdx);
  // IV should be exactly 32 hex chars (16 bytes)
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
