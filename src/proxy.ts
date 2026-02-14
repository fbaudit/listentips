import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextRequest, NextResponse } from "next/server";

const intlMiddleware = createMiddleware(routing);

// Protected route patterns
const companyProtectedPaths = ["/company/dashboard", "/company/reports", "/company/settings", "/company/subscription"];
const adminProtectedPaths = ["/admin/dashboard", "/admin/users", "/admin/companies", "/admin/codes", "/admin/subscriptions", "/admin/applications", "/admin/settings", "/admin/reports"];

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

export default async function proxy(request: NextRequest) {
  const protectedType = isProtectedPath(request.nextUrl.pathname);

  // Lightweight cookie-existence check in middleware.
  // Full JWT validation + role check is done in the respective layouts
  // (superadmin layout / dashboard layout).
  if (protectedType === "company") {
    const hasSession = request.cookies.has("authjs.company-session-token")
      || request.cookies.has("authjs.company-session-token.0");
    if (!hasSession) {
      return NextResponse.redirect(new URL("/company/login", request.url));
    }
  } else if (protectedType === "admin") {
    const hasSession = request.cookies.has("authjs.admin-session-token")
      || request.cookies.has("authjs.admin-session-token.0");
    if (!hasSession) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
