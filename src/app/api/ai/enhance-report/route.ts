import { NextRequest, NextResponse } from "next/server";
import { getCompanyAIClient } from "@/lib/ai/client";
import { REPORT_ENHANCE_PROMPT } from "@/lib/ai/prompts";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_CONTENT_LENGTH = 50_000;

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 10 requests per minute per IP
    const { checkRateLimit, getClientIp } = await import("@/lib/utils/rate-limit");
    const ip = getClientIp(request);
    const rl = checkRateLimit(`ai:enhance:${ip}`, 10, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: `요청이 너무 많습니다. ${rl.retryAfterSec}초 후 다시 시도해주세요.` }, { status: 429 });
    }

    const { content, title, companyCode, reportType } = await request.json();

    if (!content || content.length < 20) {
      return NextResponse.json(
        { error: "내용이 너무 짧습니다 (최소 20자)" },
        { status: 400 }
      );
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        { error: "내용이 너무 깁니다 (최대 50,000자)" },
        { status: 400 }
      );
    }

    if (!reportType) {
      return NextResponse.json(
        { error: "제보 유형을 선택해주세요" },
        { status: 400 }
      );
    }

    // Resolve companyId from companyCode
    let companyId: string | null = null;
    if (companyCode) {
      const supabase = createAdminClient();
      const { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("company_code", companyCode)
        .single();
      companyId = company?.id || null;
    }

    const aiClient = companyId
      ? await getCompanyAIClient(companyId)
      : await getCompanyAIClient("");

    const prompt = REPORT_ENHANCE_PROMPT
      .replace("{reportType}", reportType)
      .replace("{title}", title || "")
      .replace("{content}", content);

    const response = await aiClient.generateContent(prompt);

    const text = response.text || "";

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({
        enhancedTitle: "",
        structured: text.trim(),
        narrative: text.trim(),
      });
    }

    const result = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      enhancedTitle: result.enhancedTitle || "",
      structured: result.structured || result.enhancedContent || text.trim(),
      narrative: result.narrative || result.enhancedContent || text.trim(),
    });
  } catch (error) {
    console.error("AI enhance error:", error);
    return NextResponse.json(
      { error: "AI 내용 보강 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
