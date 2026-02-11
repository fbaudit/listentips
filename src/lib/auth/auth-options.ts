import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPassword } from "@/lib/utils/password";
import type { UserRole } from "@/types/database";

export const authOptions: NextAuthConfig = {
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
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
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.companyId = (token.companyId as string) || null;
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
