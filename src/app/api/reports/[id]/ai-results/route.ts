import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyReportAccess } from "@/lib/auth/report-access";
import { createAuditLog } from "@/lib/utils/audit-log";

const VALID_TYPES = ["summary", "violation", "investigation_plan", "questionnaire", "investigation_report"];

/** GET — Load all saved analysis results */
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
      .select("ai_analysis_results")
      .eq("id", access.reportId)
      .single();

    if (error) {
      // Column may not exist yet
      return NextResponse.json({ results: null });
    }

    return NextResponse.json({ results: data.ai_analysis_results });
  } catch (err) {
    console.error("Load AI results error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** POST — Save or delete a single analysis type */
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
    const { analysisType, result, delete: isDelete } = body;

    if (!analysisType || !VALID_TYPES.includes(analysisType)) {
      return NextResponse.json({ error: "Invalid analysis type" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Load current results
    const { data: current } = await supabase
      .from("reports")
      .select("ai_analysis_results")
      .eq("id", access.reportId)
      .single();

    const existing = (current?.ai_analysis_results as Record<string, unknown>) || {};

    if (isDelete) {
      delete existing[analysisType];
    } else {
      if (!result) {
        return NextResponse.json({ error: "Missing result data" }, { status: 400 });
      }
      existing[analysisType] = {
        ...result,
        savedAt: new Date().toISOString(),
      };
    }

    const updatedValue = Object.keys(existing).length > 0 ? existing : null;

    const { error } = await supabase
      .from("reports")
      .update({ ai_analysis_results: updatedValue })
      .eq("id", access.reportId);

    if (error) {
      console.error("Save AI result error:", error);
      return NextResponse.json({ error: "Save failed" }, { status: 500 });
    }

    await createAuditLog({
      request,
      companyId: access.companyId,
      action: "report.update",
      entityType: "report",
      entityId: access.reportId,
      changes: { new: { ai_analysis_results: `${analysisType} ${isDelete ? "deleted" : "saved"}` } },
    });

    return NextResponse.json({ message: isDelete ? "Deleted" : "Saved" });
  } catch (err) {
    console.error("Save AI result error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
