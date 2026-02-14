import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { AIClient, getCompanyAIClient } from "@/lib/ai/client";
import type { AIProvider } from "@/lib/ai/client";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { provider, apiKey, useStored } = await request.json();

    let client: AIClient;

    if (useStored) {
      client = await getCompanyAIClient(session.user.companyId);
    } else if (provider && apiKey) {
      client = new AIClient(provider as AIProvider, apiKey);
    } else {
      return NextResponse.json({ success: false, error: "API 키를 입력해주세요" });
    }

    const response = await client.generateContent("Say hello in one word.");

    if (response.text) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "응답이 비어있습니다" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({
      success: false,
      error: message.includes("401") || message.includes("403")
        ? "API 키가 유효하지 않습니다"
        : message.includes("404")
          ? "모델을 찾을 수 없습니다. API 키를 확인해주세요"
          : "AI 제공자에 연결할 수 없습니다",
    });
  }
}
