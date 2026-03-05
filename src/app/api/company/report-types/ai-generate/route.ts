import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getCompanyAIClient } from "@/lib/ai/client";
import { REPORT_TYPE_TRANSLATE_PROMPT, REPORT_TYPE_GUIDE_PROMPT } from "@/lib/ai/prompts";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const typeName = (body.typeName as string)?.trim();

    if (!typeName) {
      return NextResponse.json({ error: "유형명을 입력해주세요" }, { status: 400 });
    }

    const client = await getCompanyAIClient(session.user.companyId);

    // Step 1: Translation + Code (JSON response)
    const translatePrompt = REPORT_TYPE_TRANSLATE_PROMPT.replace("{typeName}", typeName);
    const translateRes = await client.generateContent(translatePrompt);
    const translateText = translateRes.text.trim();
    const jsonMatch = translateText.match(/\{[\s\S]*\}/);

    let type_name_en = "";
    let type_name_ja = "";
    let type_name_zh = "";
    let code = "";

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        type_name_en = parsed.type_name_en || "";
        type_name_ja = parsed.type_name_ja || "";
        type_name_zh = parsed.type_name_zh || "";
        code = parsed.code || "";
      } catch {
        // JSON parse failed, continue with empty values
      }
    }

    // Step 2: Guide (pure HTML response)
    const guidePrompt = REPORT_TYPE_GUIDE_PROMPT.replaceAll("{typeName}", typeName);
    const guideRes = await client.generateContent(guidePrompt);
    let description = guideRes.text.trim();

    // Strip markdown code fences if present
    description = description.replace(/^```html?\s*/i, "").replace(/\s*```$/, "").trim();

    return NextResponse.json({
      type_name_en,
      type_name_ja,
      type_name_zh,
      code,
      description,
    });
  } catch {
    return NextResponse.json({ error: "AI 생성 중 오류가 발생했습니다" }, { status: 500 });
  }
}
