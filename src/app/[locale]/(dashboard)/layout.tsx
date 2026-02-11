import { redirect } from "next/navigation";
import { companyAuth } from "@/lib/auth/company-auth";
import { SessionProvider } from "@/components/providers/session-provider";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardTopbar } from "@/components/layout/dashboard-topbar";

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
