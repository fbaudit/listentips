import NextAuth from "next-auth";
import { authOptions } from "./auth-options";

export const {
  handlers: adminHandlers,
  auth: adminAuth,
} = NextAuth({
  ...authOptions,
  basePath: "/api/auth/admin",
  cookies: {
    sessionToken: { name: "authjs.admin-session-token" },
    callbackUrl: { name: "authjs.admin-callback-url" },
    csrfToken: { name: "authjs.admin-csrf-token" },
  },
  pages: {
    signIn: "/admin/login",
  },
});
