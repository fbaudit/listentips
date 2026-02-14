import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createAdminClient();

  const { data: settingsRow } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "login_security")
    .single();

  const settings = settingsRow?.value || {
    captcha_enabled: true,
    two_factor_enabled: true,
  };

  return NextResponse.json({
    captcha_enabled: settings.captcha_enabled ?? true,
    two_factor_enabled: settings.two_factor_enabled ?? true,
  });
}
