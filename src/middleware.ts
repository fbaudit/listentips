import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextRequest, NextResponse } from "next/server";
import { companyAuth } from "@/lib/auth/company-auth";
import { adminAuth } from "@/lib/auth/admin-auth";

const intlMiddleware = createMiddleware(routing);

// Protected route patterns
const companyProtectedPaths = ["/company/dashboard", "/company/reports", "/company/settings", "/company/subscription"];
const adminProtectedPaths = ["/admin/dashboard", "/admin/users", "/admin/companies", "/admin/codes", "/admin/subscriptions", "/admin/applications", "/admin/settings"];

function isProtectedPath(pathname: string): "company" | "admin" | null {
  const locales = routing.locales;
  let cleanPath = pathname;
  for (const locale of locales) {
    if (pathname.startsWith(`/${locale}/`)) {
      cleanPath = pathname.substring(locale.length + 1);
      break;
    }
  }

  if (companyProtectedPaths.some((p) => cleanPath.startsWith(p))) {
    return "company";
  }
  if (adminProtectedPaths.some((p) => cleanPath.startsWith(p))) {
    return "admin";
  }
  return null;
}

export default async function middleware(request: NextRequest) {
  const protectedType = isProtectedPath(request.nextUrl.pathname);

  if (protectedType === "company") {
    const session = await companyAuth();
    if (!session?.user || session.user.role !== "company_admin") {
      return NextResponse.redirect(new URL("/company/login", request.url));
    }
  } else if (protectedType === "admin") {
    const session = await adminAuth();
    if (!session?.user || session.user.role !== "super_admin") {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
