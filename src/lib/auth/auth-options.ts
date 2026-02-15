import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPassword } from "@/lib/utils/password";
import { verifyCode } from "@/lib/utils/verification-code";
import type { UserRole, CompanyRole } from "@/types/database";

export const authOptions: NextAuthConfig = {
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        verificationCode: { label: "Verification Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const supabase = createAdminClient();
        const { data: user, error } = await supabase
          .from("users")
          .select("*")
          .eq("username", credentials.username as string)
          .eq("is_active", true)
          .single();

        if (error || !user) {
          return null;
        }

        // Check validity period
        if (user.valid_from && new Date(user.valid_from) > new Date()) {
          return null;
        }
        if (user.valid_to && new Date(user.valid_to) < new Date()) {
          return null;
        }

        const isValid = await verifyPassword(
          credentials.password as string,
          user.password_hash
        );

        if (!isValid) {
          return null;
        }

        // Check if 2FA is enabled platform-wide
        const { data: securityRow } = await supabase
          .from("platform_settings")
          .select("value")
          .eq("key", "login_security")
          .single();

        let twoFactorEnabled = securityRow?.value?.two_factor_enabled ?? true;

        // Also check company-level 2FA setting and fetch company name
        let companyName: string | null = null;
        if (user.company_id) {
          const { data: company } = await supabase
            .from("companies")
            .select("name, two_factor_enabled")
            .eq("id", user.company_id)
            .single();

          companyName = company?.name ?? null;
          if (twoFactorEnabled && company && !company.two_factor_enabled) {
            twoFactorEnabled = false;
          }
        }

        // Verify 2FA code (skip if 2FA is disabled)
        if (twoFactorEnabled) {
          const code = credentials.verificationCode as string;
          if (!code) {
            return null;
          }

          const codeValid = await verifyCode(user.id, code);
          if (!codeValid) {
            return null;
          }
        }

        // Record successful login
        const ip = "server"; // IP is recorded in the login API
        await supabase.from("login_attempts").insert({
          username: user.username,
          ip_hash: ip,
          success: true,
        });

        // Update last login
        await supabase
          .from("users")
          .update({ last_login_at: new Date().toISOString() })
          .eq("id", user.id);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          companyId: user.company_id,
          companyName,
          companyRole: user.company_role || null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.companyId = user.companyId;
        token.companyName = user.companyName;
        token.companyRole = user.companyRole;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.companyId = (token.companyId as string) || null;
        session.user.companyName = (token.companyName as string) || null;
        session.user.companyRole = (token.companyRole as CompanyRole) || null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/company/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
};
