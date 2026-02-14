import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/auth/admin-auth";
import { isAdminRole, getAdminPermissions } from "@/lib/auth/guards";

export async function GET() {
  const session = await adminAuth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = await getAdminPermissions(session.user.role);

  return NextResponse.json({ role: session.user.role, permissions });
}
