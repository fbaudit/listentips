import { redirect } from "next/navigation";
import { companyAuth } from "@/lib/auth/company-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SessionProvider } from "@/components/providers/session-provider";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardTopbarDynamic as DashboardTopbar } from "@/components/layout/dashboard-topbar-dynamic";

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

  // Check if company is still active and service is not expired
  if (session.user.companyId) {
    const supabase = createAdminClient();
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
