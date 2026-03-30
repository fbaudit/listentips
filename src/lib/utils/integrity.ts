import crypto from "crypto";

/**
 * 제보 내용의 무결성 해시(SHA-256) 생성.
 * title + content + timestamp로 해시를 만들어 위변조를 감지한다.
 */
export function generateIntegrityHash(title: string, content: string, createdAt: string): string {
  return crypto
    .createHash("sha256")
    .update(`${title}|${content}|${createdAt}`)
    .digest("hex");
}

/**
 * 무결성 해시 검증
 */
export function verifyIntegrityHash(
  title: string,
  content: string,
  createdAt: string,
  expectedHash: string
): boolean {
  const computed = generateIntegrityHash(title, content, createdAt);
  return crypto.timingSafeEqual(
    Buffer.from(computed, "hex"),
    Buffer.from(expectedHash, "hex")
  );
}
