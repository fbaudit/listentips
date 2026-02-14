import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyReportAccess } from "@/lib/auth/report-access";
import { getCompanyDataKey, encryptWithKey, decryptWithKey, isEncrypted } from "@/lib/utils/data-encryption";
import { notifyCompanyAdmins } from "@/lib/utils/notify-company-admins";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Verify access (reporter token, company admin, or super admin)
  const access = await verifyReportAccess(request, id);
  if (!access.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: comments, error } = await supabase
    .from("comments")
    .select(`
      id, content, author_type, is_internal, created_at, updated_at,
      attachments:comment_attachments(id, file_name, file_size)
    `)
    .eq("report_id", access.reportId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to load comments" }, { status: 500 });
  }

  // Reporter: auto-decrypt; Admin: must provide key via header
  const encKeyHeader = request.headers.get("x-encryption-key");
  const dataKey = access.role === "reporter"
    ? (encKeyHeader || await getCompanyDataKey(access.companyId))
    : encKeyHeader;

  const decryptedComments = (comments || []).map((c: Record<string, unknown>) => {
    const content = c.content as string;
    if (dataKey && isEncrypted(content)) {
      try {
        return { ...c, content: decryptWithKey(content, dataKey) };
      } catch {
        return { ...c, content: "[복호화 실패]" };
      }
    }
    if (!dataKey && isEncrypted(content)) {
      return { ...c, content: "[암호화됨]" };
    }
    return c;
  });

  return NextResponse.json({ comments: decryptedComments });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Verify access
  const access = await verifyReportAccess(request, id);
  if (!access.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const supabase = createAdminClient();

  // Encrypt comment content if company has encryption key
  let encContent = body.content;
  const dataKey = await getCompanyDataKey(access.companyId);
  if (dataKey) {
    encContent = encryptWithKey(body.content, dataKey);
  }

  const { data: comment, error } = await supabase
    .from("comments")
    .insert({
      report_id: access.reportId,
      content: encContent,
      author_type: body.authorType || "reporter",
      author_id: body.authorId || null,
      is_internal: body.isInternal || false,
    })
    .select("id, content, author_type, is_internal, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }

  // Notify company admins when reporter adds a comment
  if ((body.authorType || "reporter") === "reporter") {
    const { data: reportInfo } = await supabase
      .from("reports")
      .select("report_number")
      .eq("id", access.reportId)
      .single();

    if (reportInfo) {
      const origin = request.nextUrl.origin;
      notifyCompanyAdmins({
        companyId: access.companyId,
        reportId: access.reportId,
        reportNumber: reportInfo.report_number,
        eventType: "new_comment",
        title: "새로운 댓글이 등록되었습니다",
        message: "제보자가 새로운 댓글을 작성했습니다. 기업 관리자 페이지에서 확인해 주세요.",
        origin,
      }).catch((err) => console.error("Notification error:", err));
    }
  }

  // Return decrypted content in response
  const responseComment = { ...comment, content: body.content };
  return NextResponse.json({ comment: responseComment });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const access = await verifyReportAccess(request, id);
  if (!access.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { commentId, content } = body;

  if (!commentId || !content?.trim()) {
    return NextResponse.json({ error: "commentId and content are required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Verify the comment belongs to this report and the user is the author
  const { data: existing } = await supabase
    .from("comments")
    .select("id, author_type, report_id")
    .eq("id", commentId)
    .eq("report_id", access.reportId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  // Only allow editing own comments
  if (access.role === "reporter" && existing.author_type !== "reporter") {
    return NextResponse.json({ error: "Cannot edit others' comments" }, { status: 403 });
  }
  if (access.role === "company_admin" && existing.author_type === "reporter") {
    return NextResponse.json({ error: "Cannot edit others' comments" }, { status: 403 });
  }

  // Encrypt if company has encryption key
  let encContent = content.trim();
  const dataKey = await getCompanyDataKey(access.companyId);
  if (dataKey) {
    encContent = encryptWithKey(content.trim(), dataKey);
  }

  const { error } = await supabase
    .from("comments")
    .update({ content: encContent, updated_at: new Date().toISOString() })
    .eq("id", commentId);

  if (error) {
    return NextResponse.json({ error: "Failed to update comment" }, { status: 500 });
  }

  return NextResponse.json({ success: true, content: content.trim() });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const access = await verifyReportAccess(request, id);
  if (!access.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const commentId = url.searchParams.get("commentId");

  if (!commentId) {
    return NextResponse.json({ error: "commentId is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Verify the comment belongs to this report and the user is the author
  const { data: existing } = await supabase
    .from("comments")
    .select("id, author_type, report_id")
    .eq("id", commentId)
    .eq("report_id", access.reportId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  // Only allow deleting own comments
  if (access.role === "reporter" && existing.author_type !== "reporter") {
    return NextResponse.json({ error: "Cannot delete others' comments" }, { status: 403 });
  }
  if (access.role === "company_admin" && existing.author_type === "reporter") {
    return NextResponse.json({ error: "Cannot delete others' comments" }, { status: 403 });
  }

  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId);

  if (error) {
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
