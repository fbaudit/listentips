import { redirect } from "next/navigation";
import { auth } from "./auth";
import type { UserRole } from "@/types/database";

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
