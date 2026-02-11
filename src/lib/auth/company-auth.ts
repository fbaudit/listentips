import NextAuth from "next-auth";
import { authOptions } from "./auth-options";

export const {
  handlers: companyHandlers,
  auth: companyAuth,
} = NextAuth({
  ...authOptions,
  basePath: "/api/auth/company",
  cookies: {
    sessionToken: { name: "authjs.company-session-token" },
    callbackUrl: { name: "authjs.company-callback-url" },
    csrfToken: { name: "authjs.company-csrf-token" },
  },
  pages: {
    signIn: "/company/login",
  },
});
