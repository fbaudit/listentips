import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminAuth } from "@/lib/auth/admin-auth";

export async function GET() {
  const session = await adminAuth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("platform_settings")
    .select("key, value, description");

  if (error) {
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }

  // Convert array to key-value map
  const settings: Record<string, unknown> = {};
  data?.forEach((row) => {
    settings[row.key] = row.value;
  });

  return NextResponse.json({ settings });
}

export async function PUT(request: NextRequest) {
  const session = await adminAuth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { key, value } = body;

  if (!key || value === undefined) {
    return NextResponse.json({ error: "key and value are required" }, { status: 400 });
  }

  const allowedKeys = ["login_security", "email_settings", "sms_settings"];
  if (!allowedKeys.includes(key)) {
    return NextResponse.json({ error: "Invalid setting key" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("platform_settings")
    .update({ value, updated_at: new Date().toISOString() })
    .eq("key", key);

  if (error) {
    return NextResponse.json({ error: "Failed to update setting" }, { status: 500 });
  }

  return NextResponse.json({ message: "Updated" });
}
