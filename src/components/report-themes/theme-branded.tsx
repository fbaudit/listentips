/**
 * Theme 2: 소프트 케어
 */
import Link from "next/link";
import Image from "next/image";
import { FileText, Search, ShieldCheck, ArrowRight } from "lucide-react";
import { sanitizeHtml } from "@/lib/utils/sanitize";
import type { ChannelThemeProps } from "./types";
import { colorWithAlpha } from "./types";
import { renderOrderedCards } from "./card-renderer";
import { SecurityBadges } from "./security-badges";

export function ThemeBranded({ channelName, welcomeMessage, logoUrl, primaryColor, companyCode, contentBlocks, cardOrder, t }: ChannelThemeProps) {
  const actionCard = (href: string, Icon: typeof FileText, label: string, desc: string) => (
    <Link href={href} className="block group">
      <div className="flex items-center gap-4 rounded-2xl bg-white border border-slate-200/80 p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: colorWithAlpha(primaryColor, 0.07) }}>
          <Icon className="h-5 w-5" style={{ color: primaryColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[15px]" style={{ color: "#1a2332" }}>{label}</p>
          <p className="text-sm mt-0.5" style={{ color: "#64748b" }}>{desc}</p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );

  const cards = {
    submit: actionCard(`/report/${companyCode}/submit`, FileText, t("submitButton"), "안전하고 익명으로 제보할 수 있습니다"),
    check: actionCard(`/report/${companyCode}/check`, Search, t("checkButton"), "접수번호로 처리 현황을 확인합니다"),
    content: contentBlocks.length > 0 ? (
      <div className="space-y-3">
        {contentBlocks.map((block) => (
          <div key={block.id} className="rounded-2xl bg-white border border-slate-200/80 p-5">
            <div className="text-sm max-w-none [&_*]:!text-inherit [&_p]:my-2 [&_p]:leading-relaxed [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1" style={{ color: "#475569" }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.content) }} />
          </div>
        ))}
      </div>
    ) : null,
  };

  return (
    <div className="-mx-3 sm:-mx-4 rounded-t-2xl" style={{ backgroundColor: "#f0f4f8", minHeight: "85vh" }}>
      <div className="px-5 sm:px-8 py-12 sm:py-20 max-w-md mx-auto space-y-10">
        <header className="text-center space-y-6">
          {logoUrl ? (
            <div className="inline-block rounded-2xl bg-white p-4 shadow-sm border border-slate-200/80">
              <Image src={logoUrl} alt={channelName} width={140} height={56} className="object-contain" unoptimized />
            </div>
          ) : (
            <div className="mx-auto w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-200/80">
              <ShieldCheck className="h-7 w-7" style={{ color: primaryColor }} />
            </div>
          )}
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: "#1a2332" }}>{channelName}</h1>
            <p className="mt-3 text-base leading-relaxed max-w-xs mx-auto" style={{ color: "#475569" }}>{welcomeMessage}</p>
          </div>
        </header>
        <SecurityBadges variant="light" />
        {renderOrderedCards(cardOrder, cards, (children) => <div className="space-y-3">{children}</div>)}
      </div>
    </div>
  );
}
