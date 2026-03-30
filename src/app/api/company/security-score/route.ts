import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { auth } from "@/lib/auth/auth";
import { calculateSecurityScore } from "@/lib/utils/security-score";

export async function GET() {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: company, error } = await supabase
    .from("companies")
    .select("logo_url, channel_name, welcome_message, two_factor_enabled, min_password_length, require_special_chars, rate_limit_enabled, block_foreign_ip, data_encryption_key, use_ai_validation, data_retention_months")
    .eq("id", session.user.companyId)
    .single();

  if (error || !company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const result = calculateSecurityScore(company);

  return NextResponse.json(result);
}
