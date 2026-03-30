import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { Shield } from "lucide-react";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ChatbotWidget } from "@/components/shared/chatbot-widget";
import { Link } from "@/i18n/routing";

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
    .select("id, name, logo_url, primary_color, welcome_message, use_chatbot, is_active")
    .eq("company_code", companyCode)
    .eq("is_active", true)
    .single();

  if (!company) {
    notFound();
  }

  const primaryColor = company.primary_color || "#1a1a2e";

  // Convert hex to HSL for CSS variable
  function hexToHsl(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return `0 0% ${Math.round(l * 100)}%`;
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = 0;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  }

  return (
    <div
      className="min-h-screen bg-background"
      style={{ "--channel-primary": primaryColor, "--channel-primary-hsl": hexToHsl(primaryColor) } as React.CSSProperties}
    >
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <Link href={`/report/${companyCode}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Shield className="h-5 w-5" style={{ color: primaryColor }} />
            <span className="font-semibold text-sm">{company.name}</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>
        {children}
      </div>
      {company.use_chatbot && (
        <ChatbotWidget companyCode={companyCode} companyName={company.name} />
      )}
    </div>
  );
}
