import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { adminAuth } from "@/lib/auth/admin-auth";
import { isAdminRole, getAdminPermissions, getMenuKeyFromPath } from "@/lib/auth/guards";
import { SessionProvider } from "@/components/providers/session-provider";
import { SuperAdminSidebar } from "@/components/layout/superadmin-sidebar";
import { DashboardTopbarDynamic as DashboardTopbar } from "@/components/layout/dashboard-topbar-dynamic";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await adminAuth();

  if (!session?.user) {
    redirect("/admin/login?debug=no_session");
  }
  if (!isAdminRole(session.user.role)) {
    redirect(`/admin/login?debug=wrong_role_${session.user.role}`);
  }

  const allowedMenus = await getAdminPermissions(session.user.role);

  // Check if current page is allowed for this role
  const headersList = await headers();
  const pathname = headersList.get("x-next-pathname") || headersList.get("x-invoke-path") || "";
  const menuKey = getMenuKeyFromPath(pathname);

  if (menuKey && !allowedMenus.includes(menuKey)) {
    redirect("/admin/dashboard");
  }

  return (
    <SessionProvider basePath="/api/auth/admin">
      <div className="flex min-h-screen">
        <SuperAdminSidebar allowedMenus={allowedMenus} />
        <div className="flex-1 flex flex-col">
          <DashboardTopbar />
          <main className="flex-1 p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}
