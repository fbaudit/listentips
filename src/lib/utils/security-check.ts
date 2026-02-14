import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

export interface SecurityCheckResult {
  allowed: boolean;
  reason?: string;
  reasonCode?: "FOREIGN_IP" | "IP_BLOCKED" | "RATE_LIMITED";
}

export interface SecuritySettings {
  block_foreign_ip: boolean;
  allowed_countries: string[];
  ip_blocklist: string[];
  rate_limit_enabled: boolean;
  rate_limit_max_reports: number;
  rate_limit_window_minutes: number;
}

/**
 * Run security checks against company settings.
 * Call with skipRateLimit=true for report-check (login) requests.
 */
export async function checkSecurity(
  request: NextRequest,
  companyId: string,
  settings: SecuritySettings,
  options?: { skipRateLimit?: boolean }
): Promise<SecurityCheckResult> {
  // 1. IP Country Check (Vercel x-vercel-ip-country header)
  if (settings.block_foreign_ip) {
    const country = request.headers.get("x-vercel-ip-country") || "";
    if (country && !settings.allowed_countries.includes(country)) {
      return {
        allowed: false,
        reason: "해외 IP에서의 접근이 차단되었습니다",
        reasonCode: "FOREIGN_IP",
      };
    }
  }

  // 2. IP Blocklist Check
  if (settings.ip_blocklist.length > 0) {
    const ip = getClientIp(request);
    if (ip !== "unknown" && isIpBlocked(ip, settings.ip_blocklist)) {
      return {
        allowed: false,
        reason: "차단된 IP 주소입니다",
        reasonCode: "IP_BLOCKED",
      };
    }
  }

  // 3. Rate Limiting (report submission only)
  if (settings.rate_limit_enabled && !options?.skipRateLimit) {
    const ip = getClientIp(request);
    const ipHash = crypto.createHash("sha256").update(ip).digest("hex");
    const supabase = createAdminClient();
    const windowStart = new Date(
      Date.now() - settings.rate_limit_window_minutes * 60 * 1000
    ).toISOString();

    const { count } = await supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("reporter_ip_hash", ipHash)
      .gte("created_at", windowStart);

    if ((count ?? 0) >= settings.rate_limit_max_reports) {
      return {
        allowed: false,
        reason: `제보 속도 제한: ${settings.rate_limit_window_minutes}분 내 최대 ${settings.rate_limit_max_reports}건까지 제출 가능합니다`,
        reasonCode: "RATE_LIMITED",
      };
    }
  }

  return { allowed: true };
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

/**
 * Check if an IP matches any entry in the blocklist.
 * Supports single IPs and CIDR notation (IPv4).
 */
export function isIpBlocked(ip: string, blocklist: string[]): boolean {
  for (const entry of blocklist) {
    if (entry.includes("/")) {
      if (ipInCidr(ip, entry)) return true;
    } else {
      if (ip === entry) return true;
    }
  }
  return false;
}

function ipInCidr(ip: string, cidr: string): boolean {
  const [range, bits] = cidr.split("/");
  const mask = ~(2 ** (32 - parseInt(bits)) - 1);
  const ipNum = ipToNumber(ip);
  const rangeNum = ipToNumber(range);
  if (ipNum === null || rangeNum === null) return false;
  return (ipNum & mask) === (rangeNum & mask);
}

function ipToNumber(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  return parts.reduce((acc, part) => (acc << 8) + parseInt(part), 0) >>> 0;
}
