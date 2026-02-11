import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { auth } from "@/lib/auth/auth";

const EVENT_TYPES = [
  "new_report",
  "report_modified",
  "report_deleted",
  "new_comment",
  "comment_modified",
  "comment_deleted",
];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createAdminClient();

  // Verify staff belongs to company
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("id", id)
    .eq("company_id", session.user.companyId)
    .single();

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: preferences, error } = await supabase
    .from("user_notification_preferences")
    .select("id, event_type, email_enabled, sms_enabled")
    .eq("user_id", id);

  if (error) {
    return NextResponse.json({ error: "Failed to load preferences" }, { status: 500 });
  }

  // Return all event types with defaults for any missing
  const prefsMap = new Map(
    (preferences || []).map((p: { event_type: string; email_enabled: boolean; sms_enabled: boolean }) => [p.event_type, p])
  );
  const allPreferences = EVENT_TYPES.map((eventType) => {
    const existing = prefsMap.get(eventType);
    return existing || {
      event_type: eventType,
      email_enabled: true,
      sms_enabled: false,
    };
  });

  return NextResponse.json({ preferences: allPreferences });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const supabase = createAdminClient();

  // Verify staff belongs to company
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("id", id)
    .eq("company_id", session.user.companyId)
    .single();

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const preferences = body.preferences as Array<{
    event_type: string;
    email_enabled: boolean;
    sms_enabled: boolean;
  }>;

  if (!preferences || !Array.isArray(preferences)) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  // Upsert each preference
  for (const pref of preferences) {
    if (!EVENT_TYPES.includes(pref.event_type)) continue;

    await supabase
      .from("user_notification_preferences")
      .upsert(
        {
          user_id: id,
          event_type: pref.event_type,
          email_enabled: pref.email_enabled,
          sms_enabled: pref.sms_enabled,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,event_type" }
      );
  }

  return NextResponse.json({ message: "Updated" });
}
