import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { auth } from "@/lib/auth/auth";
import crypto from "crypto";

export async function GET() {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: webhooks } = await supabase
    .from("company_webhooks")
    .select("id, name, url, provider, events, is_active, created_at")
    .eq("company_id", session.user.companyId)
    .order("created_at");

  return NextResponse.json({ webhooks: webhooks || [] });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, url, provider, events } = body;

  if (!name || !url) {
    return NextResponse.json({ error: "이름과 URL이 필요합니다" }, { status: 400 });
  }

  // Validate URL
  try {
    const parsed = new URL(url);
    if (!["https:", "http:"].includes(parsed.protocol)) {
      return NextResponse.json({ error: "유효하지 않은 URL입니다" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "유효하지 않은 URL입니다" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const secretKey = crypto.randomBytes(32).toString("hex");

  const { data, error } = await supabase
    .from("company_webhooks")
    .insert({
      company_id: session.user.companyId,
      name,
      url,
      provider: provider || "custom",
      events: events || ["new_report"],
      secret_key: secretKey,
    })
    .select()
    .single();

  if (error) {
    console.error("Webhook create error:", error);
    return NextResponse.json({ error: "웹훅 생성에 실패했습니다" }, { status: 500 });
  }

  return NextResponse.json({ webhook: data, secret_key: secretKey });
}
