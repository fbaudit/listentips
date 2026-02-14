import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminAuth } from "@/lib/auth/admin-auth";
import { isAdminRole } from "@/lib/auth/guards";
import { encrypt } from "@/lib/utils/encryption";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await adminAuth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: company, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const { ai_api_key_encrypted, ai_encryption_iv, ...safeCompany } = company;
  const companyResponse = {
    ...safeCompany,
    ai_api_key_configured: !!(ai_api_key_encrypted && ai_encryption_iv),
  };

  return NextResponse.json({ company: companyResponse });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await adminAuth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const supabase = createAdminClient();

  const allowedFields = [
    "name", "name_en", "business_number", "representative_name",
    "industry", "employee_count", "address", "phone", "email", "website",
    "description", "channel_name", "welcome_message", "report_guide_message",
    "primary_color", "use_ai_validation", "use_chatbot", "preferred_locale",
    "content_blocks", "ai_provider",
    "is_active", "service_start", "service_end",
  ];

  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }

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
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ message: "Updated" });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await adminAuth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createAdminClient();

  // Verify company exists and is inactive
  const { data: company, error: fetchError } = await supabase
    .from("companies")
    .select("id, name, is_active")
    .eq("id", id)
    .single();

  if (fetchError || !company) {
    return NextResponse.json({ error: "기업을 찾을 수 없습니다" }, { status: 404 });
  }

  if (company.is_active) {
    return NextResponse.json(
      { error: "활성 상태의 기업은 삭제할 수 없습니다. 먼저 서비스를 비활성화해주세요." },
      { status: 400 }
    );
  }

  try {
    // 1. Get all report IDs for this company
    const { data: reports } = await supabase
      .from("reports")
      .select("id")
      .eq("company_id", id);
    const reportIds = (reports || []).map((r) => r.id);

    if (reportIds.length > 0) {
      // 2. Get all comment IDs for these reports
      const { data: comments } = await supabase
        .from("comments")
        .select("id")
        .in("report_id", reportIds);
      const commentIds = (comments || []).map((c) => c.id);

      // 3. Delete comment attachments
      if (commentIds.length > 0) {
        await supabase.from("comment_attachments").delete().in("comment_id", commentIds);
      }

      // 4. Delete comments
      await supabase.from("comments").delete().in("report_id", reportIds);

      // 5. Delete report attachments (files + records)
      const { data: attachments } = await supabase
        .from("report_attachments")
        .select("file_path")
        .in("report_id", reportIds);

      if (attachments && attachments.length > 0) {
        await supabase.storage
          .from("report-attachments")
          .remove(attachments.map((a) => a.file_path));
      }
      await supabase.from("report_attachments").delete().in("report_id", reportIds);

      // 6. Delete report edit history
      await supabase.from("report_edit_history").delete().in("report_id", reportIds);
    }

    // 7. Delete reports
    await supabase.from("reports").delete().eq("company_id", id);

    // 8. Get user IDs and delete user-related data
    const { data: users } = await supabase
      .from("users")
      .select("id, username")
      .eq("company_id", id);

    if (users && users.length > 0) {
      const userIds = users.map((u) => u.id);
      const usernames = users.map((u) => u.username);

      // Delete verification codes
      await supabase.from("verification_codes").delete().in("user_id", userIds);

      // Delete login attempts
      for (const username of usernames) {
        await supabase.from("login_attempts").delete().eq("username", username);
      }
    }

    // 9. Delete notifications
    await supabase.from("notifications").delete().eq("company_id", id);

    // 10. Delete users
    await supabase.from("users").delete().eq("company_id", id);

    // 11. Delete report types and statuses
    await supabase.from("report_types").delete().eq("company_id", id);
    await supabase.from("report_statuses").delete().eq("company_id", id);

    // 12. Delete subscriptions
    await supabase.from("subscriptions").delete().eq("company_id", id);

    // 13. Delete company documents (files + records)
    const { data: docs } = await supabase
      .from("company_documents")
      .select("file_path")
      .eq("company_id", id);

    if (docs && docs.length > 0) {
      await supabase.storage
        .from("company-documents")
        .remove(docs.map((d) => d.file_path));
    }
    await supabase.from("company_documents").delete().eq("company_id", id);

    // 14. Delete the company itself
    const { error: deleteError } = await supabase
      .from("companies")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Company delete error:", deleteError);
      return NextResponse.json(
        { error: `기업 삭제 실패: ${deleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "기업 데이터가 모두 삭제되었습니다" });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Company delete error:", errMsg);
    return NextResponse.json(
      { error: `삭제 중 오류가 발생했습니다: ${errMsg}` },
      { status: 500 }
    );
  }
}
