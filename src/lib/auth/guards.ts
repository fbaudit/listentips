import { redirect } from "next/navigation";
import { auth } from "./auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/types/database";

export const ADMIN_ROLES: UserRole[] = ["super_admin", "admin", "other_admin"];

const ALL_MENUS = ["dashboard", "users", "companies", "reports", "codes", "subscriptions", "applications", "settings"];

export function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.includes(role as UserRole);
}

export async function getAdminPermissions(role: string): Promise<string[]> {
  if (role === "super_admin") {
    return ALL_MENUS;
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "role_permissions")
    .single();

  if (!data?.value) return ["dashboard"];
  const permissions = data.value as Record<string, string[]>;
  return permissions[role] || ["dashboard"];
}

export function getMenuKeyFromPath(pathname: string): string | null {
  const match = pathname.match(/\/admin\/([^/]+)/);
  return match ? match[1] : null;
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    redirect("/company/login");
  }
  return session;
}

export async function requireRole(role: UserRole) {
  const session = await requireAuth();
  if (session.user.role !== role) {
    if (role === "super_admin") {
      redirect("/admin/login");
    }
    redirect("/company/login");
  }
  return session;
}

export async function requireCompany() {
  const session = await requireAuth();
  if (session.user.role !== "company_admin" || !session.user.companyId) {
    redirect("/company/login");
  }
  return {
    userId: session.user.id,
    companyId: session.user.companyId,
    session,
  };
}

export async function requireSuperAdmin() {
  const session = await requireAuth();
  if (session.user.role !== "super_admin") {
    redirect("/admin/login");
  }
  return { userId: session.user.id, session };
}
