"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ChannelThemeRenderer, type ChannelTheme } from "@/components/report-themes";
import type { ContentBlock, CardId } from "@/components/report-themes/types";
import { DEFAULT_CARD_ORDER } from "@/components/report-themes/types";

interface CompanyInfo {
  channel_name: string | null;
  channel_theme: ChannelTheme | null;
  channel_card_order: CardId[] | null;
  welcome_message: string | null;
  logo_url: string | null;
  primary_color: string | null;
  content_blocks: ContentBlock[] | null;
  use_chatbot: boolean;
}

export default function ReportMainPage() {
  const t = useTranslations("report.main");
  const params = useParams();
  const companyCode = params.companyCode as string;
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCompany() {
      try {
        const res = await fetch(`/api/companies/${companyCode}`);
        if (res.ok) {
          const data = await res.json();
          setCompany(data.company || data);
        }
      } catch {
        // ignore - will use defaults
      } finally {
        setLoading(false);
      }
    }
    fetchCompany();
  }, [companyCode]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const channelName = company?.channel_name || t("title");
  const welcomeMessage = company?.welcome_message || t("description");
  const theme = company?.channel_theme || "minimal";
  const primaryColor = company?.primary_color || "#1a1a2e";

  const contentBlocks = (company?.content_blocks || [])
    .filter((b) => b.content.trim() && b.content !== "<p></p>")
    .sort((a, b) => a.order - b.order);

  return (
    <ChannelThemeRenderer
      theme={theme}
      channelName={channelName}
      welcomeMessage={welcomeMessage}
      logoUrl={company?.logo_url || null}
      primaryColor={primaryColor}
      companyCode={companyCode}
      contentBlocks={contentBlocks}
      cardOrder={company?.channel_card_order || DEFAULT_CARD_ORDER}
      useChatbot={company?.use_chatbot || false}
      t={t}
    />
  );
}
