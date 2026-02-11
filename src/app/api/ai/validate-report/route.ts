import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient } from "@/lib/ai/gemini";
import { REPORT_VALIDATION_PROMPT } from "@/lib/ai/prompts";

export async function POST(request: NextRequest) {
  try {
    const { content, title } = await request.json();

    if (!content || content.length < 20) {
      return NextResponse.json(
        { error: "내용이 너무 짧습니다 (최소 20자)" },
        { status: 400 }
      );
    }

    const genai = getGeminiClient();

    const prompt = REPORT_VALIDATION_PROMPT
      .replace("{title}", title || "")
      .replace("{content}", content);

    const response = await genai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    const text = response.text || "";

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({
        score: 0.5,
        missingElements: [],
        suggestions: ["AI 검증 결과를 파싱할 수 없습니다"],
        extracted: { who: "", what: "", when: "", where: "", why: "", how: "" },
      });
    }

    const result = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      score: Math.min(1, Math.max(0, result.score || 0)),
      missingElements: result.missingElements || [],
      suggestions: result.suggestions || [],
      extracted: result.extracted || { who: "", what: "", when: "", where: "", why: "", how: "" },
    });
  } catch (error) {
    console.error("AI validation error:", error);
    return NextResponse.json(
      { error: "AI 검증 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
