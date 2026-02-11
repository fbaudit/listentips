import { type DefaultSession } from "next-auth";
import { type UserRole } from "./database";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      companyId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    companyId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    companyId: string | null;
  }
}
