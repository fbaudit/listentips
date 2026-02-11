import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { auth } from "@/lib/auth/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user || !session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: company, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", session.user.companyId)
    .single();

  if (error || !company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  return NextResponse.json({ company });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const supabase = createAdminClient();

  const allowedFields = [
    "name", "name_en", "business_number", "representative_name",
    "industry", "employee_count", "address", "phone", "email", "website",
    "description", "channel_name", "welcome_message", "report_guide_message",
    "primary_color", "use_ai_validation", "use_chatbot", "preferred_locale",
    "content_blocks",
  ];

  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ message: "No changes" });
  }

  updateData.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("companies")
    .update(updateData)
    .eq("id", session.user.companyId);

  if (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ message: "Updated" });
}
