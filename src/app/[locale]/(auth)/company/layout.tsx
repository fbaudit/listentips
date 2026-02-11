import { SessionProvider } from "@/components/providers/session-provider";

export default function CompanyAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider basePath="/api/auth/company">
      {children}
    </SessionProvider>
  );
}
