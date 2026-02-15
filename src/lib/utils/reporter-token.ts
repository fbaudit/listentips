import crypto from "crypto";

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is not configured");
  }
  return secret;
}

const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

/**
 * Generate a reporter access token that includes reportId and companyId.
 * Format: base64(reportId:companyId:timestamp).hmac
 */
export function generateReporterToken(reportId: string, companyId: string): string {
  const timestamp = Date.now().toString();
  const payload = `${reportId}:${companyId}:${timestamp}`;
  const encoded = Buffer.from(payload).toString("base64url");
  const hmac = crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("hex");
  return `${encoded}.${hmac}`;
}

/**
 * Verify a reporter token and return the embedded data.
 * Returns null if invalid or expired.
 */
export function verifyReporterToken(
  token: string
): { reportId: string; companyId: string } | null {
  try {
    const [encoded, hmac] = token.split(".");
    if (!encoded || !hmac) return null;

    const payload = Buffer.from(encoded, "base64url").toString("utf-8");
    const expectedHmac = crypto
      .createHmac("sha256", getSecret())
      .update(payload)
      .digest("hex");

    // Timing-safe comparison to prevent timing attacks
    const hmacBuf = Buffer.from(hmac, "hex");
    const expectedBuf = Buffer.from(expectedHmac, "hex");
    if (hmacBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(hmacBuf, expectedBuf)) return null;

    const [reportId, companyId, timestampStr] = payload.split(":");
    if (!reportId || !companyId || !timestampStr) return null;

    const timestamp = parseInt(timestampStr, 10);
    if (Date.now() - timestamp > TOKEN_EXPIRY_MS) return null;

    return { reportId, companyId };
  } catch {
    return null;
  }
}
