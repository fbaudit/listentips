import { GoogleGenAI } from "@google/genai";

let genaiInstance: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!genaiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }
    genaiInstance = new GoogleGenAI({ apiKey });
  }
  return genaiInstance;
}
