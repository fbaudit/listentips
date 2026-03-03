import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";
import type { AuditAction, AuditEntityType } from "@/types/database";

interface CreateAuditLogParams {
  request?: NextRequest | null;
  companyId?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;
  changes?: { old?: Record<string, unknown>; new?: Record<string, unknown> } | null;
}

export async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  try {
    const supabase = createAdminClient();

    let ipHash: string | null = null;
    if (params.request) {
      const ip =
        params.request.headers.get("x-forwarded-for") ||
        params.request.headers.get("cf-connecting-ip") ||
        "unknown";
      if (ip !== "unknown") {
        ipHash = crypto.createHash("sha256").update(ip).digest("hex");
      }
    }

    await supabase.from("audit_logs").insert({
      company_id: params.companyId || null,
      actor_id: params.actorId || null,
      actor_name: params.actorName || null,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId || null,
      changes: params.changes || null,
      ip_hash: ipHash,
    });
  } catch (err) {
    console.error("Audit log error:", err);
  }
}
