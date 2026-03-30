/**
 * Theme 3: 다크 프로페셔널
 * 다크 네이비, 밝은 텍스트, 격조 있는 기업 느낌
 * 배경 #111827, 제목 #f9fafb (대비 18:1), 본문 #d1d5db (대비 11:1), 보조 #9ca3af (대비 6.5:1)
 */
import Link from "next/link";
import Image from "next/image";
import { FileText, Search, Shield, ArrowRight } from "lucide-react";
import { sanitizeHtmlStripColors as sanitizeHtml } from "@/lib/utils/sanitize";
import type { ChannelThemeProps } from "./types";
import { colorWithAlpha } from "./types";
import { renderOrderedCards } from "./card-renderer";
import { SecurityBadges } from "./security-badges";

export function ThemeGlassmorphism({ channelName, welcomeMessage, logoUrl, primaryColor, companyCode, contentBlocks, cardOrder, t }: ChannelThemeProps) {
  const bg = "#111827";
  const card = "#1f2937";
  const border = "#374151";
  const heading = "#f9fafb";
  const body = "#d1d5db";
  const muted = "#9ca3af";
  const accent = "#60a5fa";

  const actionCard = (href: string, Icon: typeof FileText, label: string) => (
    <Link href={href} className="group">
      <div
        className="rounded-xl p-6 text-center space-y-4 transition-all duration-300 hover:-translate-y-1"
        style={{ backgroundColor: card, border: `1px solid ${border}` }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = accent; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = border; }}
      >
        <div className="mx-auto w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: colorWithAlpha(accent, 0.12) }}>
          <Icon className="h-5 w-5" style={{ color: accent }} />
        </div>
        <p className="font-bold text-sm" style={{ color: heading }}>{label}</p>
        <ArrowRight className="h-3.5 w-3.5 mx-auto transition-transform group-hover:translate-x-1" style={{ color: muted }} />
      </div>
    </Link>
  );

  const cards = {
    submit: actionCard(`/report/${companyCode}/submit`, FileText, t("submitButton")),
    check: actionCard(`/report/${companyCode}/check`, Search, t("checkButton")),
    content: contentBlocks.length > 0 ? (
      <div className="space-y-3">
        {contentBlocks.map((block) => (
          <div key={block.id} className="rounded-xl p-6" style={{ backgroundColor: card, border: `1px solid ${border}`, color: "#e5e7eb" }}>
            <div
              className="text-sm max-w-none [&_*]:!text-inherit [&_p]:my-2 [&_p]:leading-relaxed [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_strong]:font-bold"
              style={{ color: "#e5e7eb" }}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.content) }}
            />
          </div>
        ))}
      </div>
    ) : null,
  };

  return (
    <div className="-mx-3 sm:-mx-4 rounded-t-2xl" style={{ backgroundColor: bg, minHeight: "85vh" }}>
      <div className="px-5 sm:px-8 py-12 sm:py-20 max-w-md mx-auto space-y-12">

        {/* 구분선 */}
        <div className="flex items-center justify-center gap-4">
          <div className="h-px w-16" style={{ backgroundColor: border }} />
          <div className="w-1.5 h-1.5 rotate-45" style={{ backgroundColor: accent }} />
          <div className="h-px w-16" style={{ backgroundColor: border }} />
        </div>

        <header className="text-center space-y-6">
          {logoUrl ? (
            <div className="inline-block rounded-xl p-4" style={{ backgroundColor: card, border: `1px solid ${border}` }}>
              <Image src={logoUrl} alt={channelName} width={140} height={56} className="object-contain brightness-110" unoptimized />
            </div>
          ) : (
            <div className="mx-auto w-16 h-16 rounded-xl flex items-center justify-center" style={{ backgroundColor: card, border: `1px solid ${border}` }}>
              <Shield className="h-7 w-7" style={{ color: accent }} />
            </div>
          )}
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: heading }}>{channelName}</h1>
            <p className="mt-3 text-base leading-relaxed max-w-xs mx-auto" style={{ color: body }}>{welcomeMessage}</p>
          </div>
        </header>

        <SecurityBadges variant="dark" />

        {renderOrderedCards(cardOrder, cards, (children) => <div className="grid grid-cols-2 gap-3">{children}</div>)}

        <div className="flex items-center justify-center gap-3 pt-4">
          <div className="h-px w-10" style={{ backgroundColor: border }} />
          <p className="text-[11px] tracking-[0.2em] uppercase" style={{ color: muted }}>Secure & Confidential</p>
          <div className="h-px w-10" style={{ backgroundColor: border }} />
        </div>

      </div>
    </div>
  );
}
