import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { auth } from "@/lib/auth/auth";
import { encrypt } from "@/lib/utils/encryption";

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

  // Exclude encrypted fields, expose only whether API key is configured
  const { ai_api_key_encrypted, ai_encryption_iv, ...safeCompany } = company;
  const companyResponse = {
    ...safeCompany,
    ai_api_key_configured: !!(ai_api_key_encrypted && ai_encryption_iv),
  };

  return NextResponse.json({ company: companyResponse });
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
    "content_blocks", "ai_provider",
    "block_foreign_ip", "allowed_countries", "ip_blocklist",
    "rate_limit_enabled", "rate_limit_max_reports", "rate_limit_window_minutes",
    "min_password_length", "require_special_chars",
    "two_factor_enabled",
  ];

  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }

  // Validate security fields
  if (body.rate_limit_max_reports !== undefined) {
    const val = Number(body.rate_limit_max_reports);
    if (isNaN(val) || val < 1 || val > 100) {
      return NextResponse.json({ error: "Invalid rate limit value" }, { status: 400 });
    }
  }
  if (body.rate_limit_window_minutes !== undefined) {
    const val = Number(body.rate_limit_window_minutes);
    if (isNaN(val) || val < 1 || val > 1440) {
      return NextResponse.json({ error: "Invalid rate limit window" }, { status: 400 });
    }
  }
  if (body.min_password_length !== undefined) {
    const val = Number(body.min_password_length);
    if (isNaN(val) || val < 6 || val > 32) {
      return NextResponse.json({ error: "Invalid password length" }, { status: 400 });
    }
  }
  if (body.ip_blocklist !== undefined) {
    if (!Array.isArray(body.ip_blocklist)) {
      return NextResponse.json({ error: "ip_blocklist must be an array" }, { status: 400 });
    }
    const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
    for (const entry of body.ip_blocklist) {
      if (!cidrRegex.test(entry)) {
        return NextResponse.json({ error: `Invalid IP/CIDR: ${entry}` }, { status: 400 });
      }
    }
  }

  // Handle AI API key separately (encrypt before saving)
  if (body.ai_api_key && typeof body.ai_api_key === "string" && body.ai_api_key.trim()) {
    const { encrypted, iv } = encrypt(body.ai_api_key.trim());
    updateData.ai_api_key_encrypted = encrypted;
    updateData.ai_encryption_iv = iv;
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
    console.error("Settings update error:", error);
    return NextResponse.json({ error: `Update failed: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ message: "Updated" });
}
