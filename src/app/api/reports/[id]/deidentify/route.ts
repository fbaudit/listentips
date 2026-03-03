import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyReportAccess } from "@/lib/auth/report-access";
import { createAuditLog } from "@/lib/utils/audit-log";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const access = await verifyReportAccess(request, id);
    if (!access.authorized || access.role === "reporter") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("reports")
      .select("deidentified_data")
      .eq("id", access.reportId)
      .single();

    if (error) {
      // Column may not exist yet (migration not applied) — return null gracefully
      return NextResponse.json({ deidentifiedData: null });
    }

    return NextResponse.json({ deidentifiedData: data.deidentified_data });
  } catch (err) {
    console.error("Load deidentified data error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const access = await verifyReportAccess(request, id);
    if (!access.authorized || access.role === "reporter") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { deidentifiedData } = body;
    const isDelete = body.delete === true;

    // Handle delete
    if (isDelete) {
      const supabase = createAdminClient();
      await supabase
        .from("reports")
        .update({ deidentified_data: null })
        .eq("id", access.reportId);

      await createAuditLog({
        request,
        companyId: access.companyId,
        action: "report.update",
        entityType: "report",
        entityId: access.reportId,
        changes: { new: { deidentified_data: "deleted" } },
      });

      return NextResponse.json({ message: "Deleted" });
    }

    if (!deidentifiedData?.deidentifiedContent || !deidentifiedData?.mappingTable) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    // Add timestamp
    deidentifiedData.generatedAt = new Date().toISOString();

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("reports")
      .update({ deidentified_data: deidentifiedData })
      .eq("id", access.reportId);

    if (error) {
      console.error("Save deidentified data error:", error);
      return NextResponse.json({ error: "Save failed" }, { status: 500 });
    }

    await createAuditLog({
      request,
      companyId: access.companyId,
      action: "report.update",
      entityType: "report",
      entityId: access.reportId,
      changes: { new: { deidentified_data: "updated" } },
    });

    return NextResponse.json({ message: "Saved" });
  } catch (err) {
    console.error("Save deidentified data error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
