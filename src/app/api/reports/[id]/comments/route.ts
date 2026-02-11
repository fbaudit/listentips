import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

async function resolveReportId(supabase: ReturnType<typeof createAdminClient>, id: string): Promise<string | null> {
  if (isUUID(id)) {
    const { data } = await supabase.from("reports").select("id").eq("id", id).single();
    return data?.id || null;
  }
  const { data } = await supabase.from("reports").select("id").eq("report_number", id).single();
  return data?.id || null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();

  const reportId = await resolveReportId(supabase, id);
  if (!reportId) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const { data: comments, error } = await supabase
    .from("comments")
    .select(`
      id, content, author_type, is_internal, created_at, updated_at,
      attachments:comment_attachments(id, file_name, file_size)
    `)
    .eq("report_id", reportId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to load comments" }, { status: 500 });
  }

  return NextResponse.json({ comments });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const supabase = createAdminClient();

  const reportId = await resolveReportId(supabase, id);
  if (!reportId) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const { data: comment, error } = await supabase
    .from("comments")
    .insert({
      report_id: reportId,
      content: body.content,
      author_type: body.authorType || "reporter",
      author_id: body.authorId || null,
      is_internal: body.isInternal || false,
    })
    .select("id, content, author_type, is_internal, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }

  return NextResponse.json({ comment });
}
