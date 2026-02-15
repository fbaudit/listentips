"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Search, Shield, Loader2 } from "lucide-react";
import { sanitizeHtml } from "@/lib/utils/sanitize";

interface ContentBlock {
  id: string;
  content: string;
  order: number;
}

interface CompanyInfo {
  channel_name: string | null;
  welcome_message: string | null;
  logo_url: string | null;
  content_blocks: ContentBlock[] | null;
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

  const channelName = company?.channel_name || t("title");
  const welcomeMessage = company?.welcome_message || t("description");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="text-center space-y-8">
      <div className="space-y-3">
        {company?.logo_url ? (
          <div className="mx-auto flex items-center justify-center">
            <img
              src={company.logo_url}
              alt={channelName}
              style={{ maxWidth: "200px", maxHeight: "80px" }}
              className="object-contain"
            />
          </div>
        ) : (
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-8 w-8 text-primary" />
          </div>
        )}
        <h1 className="text-2xl md:text-3xl font-bold">{channelName}</h1>
        <p className="text-muted-foreground max-w-md mx-auto">{welcomeMessage}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
        <Link href={`/report/${companyCode}/submit`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="pt-6 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">{t("submitButton")}</h3>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/report/${companyCode}/check`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="pt-6 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Search className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">{t("checkButton")}</h3>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Content Blocks */}
      {company?.content_blocks && company.content_blocks.length > 0 && (
        <div className="space-y-4 max-w-lg mx-auto">
          {[...company.content_blocks]
            .sort((a, b) => a.order - b.order)
            .filter((block) => block.content.trim() && block.content !== "<p></p>")
            .map((block) => (
              <Card key={block.id}>
                <CardContent className="pt-5 pb-5">
                  <div
                    className="prose prose-sm max-w-none text-left text-muted-foreground [&_strong]:text-foreground [&_p]:my-1"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.content) }}
                  />
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
