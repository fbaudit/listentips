import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { auth } from "@/lib/auth/auth";

const VALID_TYPES = [
  "deidentification", "summary", "violation",
  "investigation_plan", "questionnaire", "investigation_report", "auto_reply",
];

// GET: Fetch all custom prompts for the company
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: prompts, error } = await supabase
      .from("company_ai_prompts")
      .select("id, prompt_type, prompt_template, updated_at")
      .eq("company_id", session.user.companyId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ prompts: prompts || [] });
  } catch (err) {
    console.error("Fetch prompts error:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

// POST: Create or update a custom prompt
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { promptType, promptTemplate } = body;

    if (!promptType || !VALID_TYPES.includes(promptType)) {
      return NextResponse.json({ error: "Invalid prompt type" }, { status: 400 });
    }

    if (!promptTemplate?.trim()) {
      return NextResponse.json({ error: "Prompt template is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("company_ai_prompts")
      .upsert(
        {
          company_id: session.user.companyId,
          prompt_type: promptType,
          prompt_template: promptTemplate.trim(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "company_id,prompt_type" }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ prompt: data });
  } catch (err) {
    console.error("Save prompt error:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

// DELETE: Reset a custom prompt (delete = revert to default)
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const promptType = searchParams.get("promptType");

    if (!promptType || !VALID_TYPES.includes(promptType)) {
      return NextResponse.json({ error: "Invalid prompt type" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("company_ai_prompts")
      .delete()
      .eq("company_id", session.user.companyId)
      .eq("prompt_type", promptType);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete prompt error:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
