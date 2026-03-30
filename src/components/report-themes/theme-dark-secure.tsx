/**
 * Theme 5: 트러스트 블루
 * 딥블루 그라디언트 히어로 + 밝은 배경 카드, 전문기관/공공기관 느낌
 * 히어로: white on #1e3a5f ≥ 10:1, 카드: #1e293b on #ffffff ≥ 14:1, #4b5563 on #ffffff ≥ 7.5:1
 */
import Link from "next/link";
import Image from "next/image";
import { FileText, Search, Shield, ArrowRight, Lock } from "lucide-react";
import { sanitizeHtml } from "@/lib/utils/sanitize";
import type { ChannelThemeProps } from "./types";
import { colorWithAlpha } from "./types";
import { renderOrderedCards } from "./card-renderer";
import { SecurityBadges } from "./security-badges";

export function ThemeDarkSecure({ channelName, welcomeMessage, logoUrl, primaryColor, companyCode, contentBlocks, cardOrder, t }: ChannelThemeProps) {
  const gradStart = "#1e3a5f";
  const gradEnd = "#0f172a";
  const pageBg = "#f1f5f9";
  const card = "#ffffff";
  const heading = "#1e293b";
  const body = "#4b5563";
  const muted = "#9ca3af";
  const accent = "#2563eb";

  const actionCard = (href: string, Icon: typeof FileText, label: string, desc: string) => (
    <Link href={href} className="block group">
      <div className="flex items-center gap-4 rounded-2xl p-5 shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5" style={{ backgroundColor: card, borderLeft: `4px solid ${accent}` }}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: colorWithAlpha(accent, 0.07) }}>
          <Icon className="h-5 w-5" style={{ color: accent }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[15px]" style={{ color: heading }}>{label}</p>
          <p className="text-sm mt-0.5" style={{ color: body }}>{desc}</p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" style={{ color: muted }} />
      </div>
    </Link>
  );

  const cards = {
    submit: actionCard(`/report/${companyCode}/submit`, FileText, t("submitButton"), "안전하고 익명으로 제보할 수 있습니다"),
    check: actionCard(`/report/${companyCode}/check`, Search, t("checkButton"), "접수번호로 처리 현황을 확인합니다"),
    content: contentBlocks.length > 0 ? (
      <div className="px-5 sm:px-8 space-y-3 max-w-md mx-auto pt-8">
        {contentBlocks.map((block) => (
          <div key={block.id} className="rounded-2xl p-5 shadow-sm" style={{ backgroundColor: card }}>
            <div className="text-sm max-w-none [&_p]:my-2 [&_p]:leading-relaxed [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1" style={{ color: body }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.content) }} />
          </div>
        ))}
      </div>
    ) : null,
  };

  return (
    <div className="-mx-3 sm:-mx-4 rounded-t-2xl" style={{ backgroundColor: pageBg, minHeight: "85vh" }}>

      {/* Hero */}
      <div
        className="relative overflow-hidden px-6 pt-14 sm:pt-20 pb-20 text-center"
        style={{ background: `linear-gradient(160deg, ${gradStart} 0%, ${gradEnd} 100%)` }}
      >
        <div className="relative space-y-5 max-w-sm mx-auto">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide uppercase px-3 py-1.5 rounded-full bg-white/15 text-white/90">
            <Lock className="h-3 w-3" />
            익명 제보 채널
          </span>

          {logoUrl ? (
            <div className="flex justify-center">
              <div className="rounded-2xl bg-white/95 px-5 py-3 shadow-lg">
                <Image src={logoUrl} alt={channelName} width={140} height={52} className="object-contain" unoptimized />
              </div>
            </div>
          ) : (
            <div className="mx-auto w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
              <Shield className="h-7 w-7 text-white" />
            </div>
          )}

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">{channelName}</h1>
          <p className="text-base leading-relaxed text-white/80 max-w-xs mx-auto">{welcomeMessage}</p>
        </div>
      </div>

      {/* Action cards — 히어로 오버랩 */}
      <div className="relative -mt-10 z-10 px-5 sm:px-8 max-w-md mx-auto space-y-6">
        {renderOrderedCards(cardOrder, cards, (children) => <div className="space-y-3">{children}</div>)}
        <SecurityBadges variant="light" />
      </div>

      <div className="h-12" />
    </div>
  );
}
