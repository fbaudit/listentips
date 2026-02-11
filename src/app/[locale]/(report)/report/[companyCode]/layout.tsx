import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { Shield } from "lucide-react";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

export default async function ReportCompanyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ companyCode: string }>;
}) {
  const { companyCode } = await params;
  const supabase = createAdminClient();

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, logo_url, primary_color, welcome_message, is_active")
    .eq("company_code", companyCode)
    .eq("is_active", true)
    .single();

  if (!company) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">{company.name}</span>
          </div>
          <LanguageSwitcher />
        </div>
        {children}
      </div>
    </div>
  );
}
