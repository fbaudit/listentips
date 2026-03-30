import NextAuth from "next-auth";
import { authOptions } from "./auth-options";

export const {
  handlers: companyHandlers,
  auth: companyAuth,
} = NextAuth({
  ...authOptions,
  basePath: "/api/auth/company",
  cookies: {
    sessionToken: {
      name: "authjs.company-session-token",
      options: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" },
    },
    callbackUrl: {
      name: "authjs.company-callback-url",
      options: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" },
    },
    csrfToken: {
      name: "authjs.company-csrf-token",
      options: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" },
    },
  },
  pages: {
    signIn: "/company/login",
  },
});
