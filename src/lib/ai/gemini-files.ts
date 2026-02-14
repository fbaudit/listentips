import { GoogleGenAI } from "@google/genai";

const EXPIRY_HOURS = 47; // Gemini files expire after 48h, use 47h for safety margin

export interface GeminiFileResult {
  uri: string;
  name: string;
}

// ── Gemini File API (fileData 파트용, 48시간 만료) ──

/**
 * 텍스트 내용을 Gemini File API에 Blob으로 업로드합니다.
 */
export async function uploadToGemini(
  apiKey: string,
  fileName: string,
  content: string,
  mimeType: string = "text/plain"
): Promise<GeminiFileResult> {
  const genai = new GoogleGenAI({ apiKey });
  const blob = new Blob([content], { type: mimeType });

  const file = await genai.files.upload({
    file: blob,
    config: { mimeType, displayName: fileName },
  });

  if (!file.uri || !file.name) {
    throw new Error("Gemini file upload failed: missing uri or name");
  }

  return { uri: file.uri, name: file.name };
}

/**
 * Gemini File API에서 파일을 삭제합니다.
 */
export async function deleteFromGemini(
  apiKey: string,
  fileName: string
): Promise<void> {
  const genai = new GoogleGenAI({ apiKey });
  await genai.files.delete({ name: fileName });
}

/**
 * Gemini 파일이 만료되었는지 확인합니다. (48시간 만료, 47시간 안전 마진)
 */
export function isGeminiFileExpired(uploadedAt: string | null): boolean {
  if (!uploadedAt) return true;
  const uploaded = new Date(uploadedAt).getTime();
  const now = Date.now();
  return now - uploaded > EXPIRY_HOURS * 60 * 60 * 1000;
}

/**
 * 글로벌 Gemini API 키를 가져옵니다.
 */
export function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY가 설정되지 않았습니다");
  }
  return key;
}
