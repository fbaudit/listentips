import { SessionProvider } from "@/components/providers/session-provider";

export default function AdminAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider basePath="/api/auth/admin">
      {children}
    </SessionProvider>
  );
}
