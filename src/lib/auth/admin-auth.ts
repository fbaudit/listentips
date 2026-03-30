import NextAuth from "next-auth";
import { authOptions } from "./auth-options";

export const {
  handlers: adminHandlers,
  auth: adminAuth,
} = NextAuth({
  ...authOptions,
  basePath: "/api/auth/admin",
  cookies: {
    sessionToken: {
      name: "authjs.admin-session-token",
      options: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" },
    },
    callbackUrl: {
      name: "authjs.admin-callback-url",
      options: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" },
    },
    csrfToken: {
      name: "authjs.admin-csrf-token",
      options: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" },
    },
  },
  pages: {
    signIn: "/admin/login",
  },
});
