import { GoogleGenAI } from "@google/genai";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/utils/encryption";

export type AIProvider = "gemini" | "openai" | "claude";

export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIResponse {
  text: string;
}

export class AIClient {
  private provider: AIProvider;
  private apiKey: string;

  constructor(provider: AIProvider, apiKey: string) {
    this.provider = provider;
    this.apiKey = apiKey;
  }

  async generateContent(prompt: string): Promise<AIResponse> {
    switch (this.provider) {
      case "gemini":
        return this.geminiGenerate(prompt);
      case "openai":
        return this.openaiGenerate(prompt);
      case "claude":
        return this.claudeGenerate(prompt);
    }
  }

  async generateChat(messages: AIMessage[]): Promise<AIResponse> {
    switch (this.provider) {
      case "gemini":
        return this.geminiChat(messages);
      case "openai":
        return this.openaiChat(messages);
      case "claude":
        return this.claudeChat(messages);
    }
  }

  // ── Gemini ──────────────────────────────────────────────

  private async geminiGenerate(prompt: string): Promise<AIResponse> {
    const genai = new GoogleGenAI({ apiKey: this.apiKey });
    const response = await genai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });
    return { text: response.text || "" };
  }

  private async geminiChat(messages: AIMessage[]): Promise<AIResponse> {
    const genai = new GoogleGenAI({ apiKey: this.apiKey });
    const contents = messages.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));
    const response = await genai.models.generateContent({
      model: "gemini-2.0-flash",
      contents,
    });
    return { text: response.text || "" };
  }

  // ── OpenAI ──────────────────────────────────────────────

  private async openaiGenerate(prompt: string): Promise<AIResponse> {
    return this.openaiChat([{ role: "user", content: prompt }]);
  }

  private async openaiChat(messages: AIMessage[]): Promise<AIResponse> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${err}`);
    }

    const data = await response.json();
    return { text: data.choices[0]?.message?.content || "" };
  }

  // ── Claude ──────────────────────────────────────────────

  private async claudeGenerate(prompt: string): Promise<AIResponse> {
    return this.claudeChat([{ role: "user", content: prompt }]);
  }

  private async claudeChat(messages: AIMessage[]): Promise<AIResponse> {
    const systemMsg = messages.find((m) => m.role === "system");
    const chatMsgs = messages.filter((m) => m.role !== "system");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 4096,
        ...(systemMsg ? { system: systemMsg.content } : {}),
        messages: chatMsgs.map((msg) => ({
          role: msg.role === "assistant" ? "assistant" : "user",
          content: msg.content,
        })),
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Claude API error: ${response.status} ${err}`);
    }

    const data = await response.json();
    return { text: data.content[0]?.text || "" };
  }
}

/**
 * 회사별 AI 클라이언트를 가져옵니다.
 * 회사에 AI 설정이 있으면 해당 프로바이더를 사용하고,
 * 없으면 글로벌 GEMINI_API_KEY로 폴백합니다.
 */
export async function getCompanyAIClient(companyId: string): Promise<AIClient> {
  if (companyId) {
    const supabase = createAdminClient();
    const { data: company } = await supabase
      .from("companies")
      .select("ai_provider, ai_api_key_encrypted, ai_encryption_iv")
      .eq("id", companyId)
      .single();

    if (company?.ai_provider && company.ai_api_key_encrypted && company.ai_encryption_iv) {
      const apiKey = decrypt(company.ai_api_key_encrypted, company.ai_encryption_iv);
      return new AIClient(company.ai_provider as AIProvider, apiKey);
    }
  }

  // 폴백: 글로벌 Gemini
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    throw new Error("AI provider가 설정되지 않았습니다");
  }
  return new AIClient("gemini", geminiKey);
}
