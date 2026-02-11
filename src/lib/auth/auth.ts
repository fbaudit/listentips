// Re-export company auth as default for backward compatibility
// Company API routes can keep using: import { auth } from "@/lib/auth/auth"
export { companyAuth as auth, companyHandlers as handlers } from "./company-auth";
