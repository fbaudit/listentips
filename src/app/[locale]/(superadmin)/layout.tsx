import { redirect } from "next/navigation";
import { adminAuth } from "@/lib/auth/admin-auth";
import { SessionProvider } from "@/components/providers/session-provider";
import { SuperAdminSidebar } from "@/components/layout/superadmin-sidebar";
import { DashboardTopbar } from "@/components/layout/dashboard-topbar";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await adminAuth();

  if (!session?.user) {
    redirect("/admin/login");
  }
  if (session.user.role !== "super_admin") {
    redirect("/admin/login");
  }

  return (
    <SessionProvider basePath="/api/auth/admin">
      <div className="flex min-h-screen">
        <SuperAdminSidebar />
        <div className="flex-1 flex flex-col">
          <DashboardTopbar />
          <main className="flex-1 p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}
