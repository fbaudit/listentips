import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { companyAuth } from "@/lib/auth/company-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCompanyMenuPermissions, getCompanyMenuKeyFromPath } from "@/lib/auth/company-permissions";
import { SessionProvider } from "@/components/providers/session-provider";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardTopbarDynamic as DashboardTopbar } from "@/components/layout/dashboard-topbar-dynamic";
import type { CompanyRole } from "@/types/database";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await companyAuth();

  if (!session?.user) {
    redirect("/company/login");
  }
  if (session.user.role !== "company_admin") {
    redirect("/company/login");
  }

  const supabase = createAdminClient();

  // Check if company is still active and service is not expired
  if (session.user.companyId) {
    const { data: company } = await supabase
      .from("companies")
      .select("is_active, service_end")
      .eq("id", session.user.companyId)
      .single();

    if (!company?.is_active) {
      redirect("/company/expired");
    }

    if (company.service_end && new Date(company.service_end) < new Date()) {
      redirect("/company/expired");
    }
  }

  // Route-level permission check based on company_role
  let companyRole: CompanyRole = (session.user.companyRole as CompanyRole) || "manager";

  // Fallback: fetch from DB if not in session (for existing sessions before migration)
  if (!session.user.companyRole) {
    const { data: userRow } = await supabase
      .from("users")
      .select("company_role")
      .eq("id", session.user.id)
      .single();
    companyRole = (userRow?.company_role as CompanyRole) || "manager";
  }

  const allowedMenus = getCompanyMenuPermissions(companyRole);
  const headersList = await headers();
  const pathname = headersList.get("x-next-pathname") || headersList.get("x-invoke-path") || "";
  const menuKey = getCompanyMenuKeyFromPath(pathname);

  if (menuKey && !allowedMenus.includes(menuKey as never)) {
    redirect("/company/dashboard");
  }

  return (
    <SessionProvider basePath="/api/auth/company">
      <div className="flex min-h-screen">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col">
          <DashboardTopbar />
          <main className="flex-1 p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}
