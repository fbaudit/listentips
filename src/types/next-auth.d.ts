import { type DefaultSession } from "next-auth";
import { type UserRole, type CompanyRole } from "./database";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      companyId: string | null;
      companyName: string | null;
      companyRole: CompanyRole | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    companyId: string | null;
    companyName: string | null;
    companyRole: CompanyRole | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    companyId: string | null;
    companyName: string | null;
    companyRole: CompanyRole | null;
  }
}
