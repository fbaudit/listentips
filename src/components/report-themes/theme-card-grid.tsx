/**
 * Theme 4: 시큐어 테크
 * 딥 다크 + 에메랄드 보안 악센트, 기술적 신뢰감
 * 배경 #0a0f1a, 제목 #f1f5f9 (대비 17:1), 본문 #cbd5e1 (대비 10:1), 보조 #94a3b8 (대비 6.5:1)
 */
import Link from "next/link";
import Image from "next/image";
import { FileText, Search, Shield, Lock } from "lucide-react";
import { sanitizeHtmlStripColors as sanitizeHtml } from "@/lib/utils/sanitize";
import type { ChannelThemeProps } from "./types";
import { colorWithAlpha } from "./types";
import { renderOrderedCards } from "./card-renderer";
import { SecurityBadges } from "./security-badges";

export function ThemeCardGrid({ channelName, welcomeMessage, logoUrl, primaryColor, companyCode, contentBlocks, cardOrder, t }: ChannelThemeProps) {
  const bg = "#0a0f1a";
  const card = "#111827";
  const border = "#1e293b";
  const green = "#34d399";
  const heading = "#f1f5f9";
  const body = "#cbd5e1";
  const muted = "#94a3b8";

  const actionCard = (href: string, Icon: typeof FileText, label: string, desc: string) => (
    <Link href={href} className="block group">
      <div
        className="flex items-center gap-4 rounded-xl p-5 transition-all duration-300 hover:-translate-y-0.5"
        style={{ backgroundColor: card, border: `1px solid ${border}` }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = green; e.currentTarget.style.boxShadow = `0 0 24px ${colorWithAlpha(green, 0.08)}`; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = border; e.currentTarget.style.boxShadow = "none"; }}
      >
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: colorWithAlpha(green, 0.1) }}>
          <Icon className="h-5 w-5" style={{ color: green }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[15px]" style={{ color: heading }}>{label}</p>
          <p className="text-sm mt-0.5" style={{ color: muted }}>{desc}</p>
        </div>
      </div>
    </Link>
  );

  const cards = {
    submit: actionCard(`/report/${companyCode}/submit`, FileText, t("submitButton"), "귀하의 제보는 암호화되어 안전하게 보호됩니다"),
    check: actionCard(`/report/${companyCode}/check`, Search, t("checkButton"), "접수번호와 비밀번호로 안전하게 확인합니다"),
    content: contentBlocks.length > 0 ? (
      <div className="space-y-3">
        {contentBlocks.map((block) => (
          <div key={block.id} className="rounded-xl p-5" style={{ backgroundColor: card, border: `1px solid ${border}`, color: "#e2e8f0" }}>
            <div
              className="text-sm max-w-none [&_*]:!text-inherit [&_p]:my-2 [&_p]:leading-relaxed [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_strong]:font-bold"
              style={{ color: "#e2e8f0" }}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.content) }}
            />
          </div>
        ))}
      </div>
    ) : null,
  };

  return (
    <div className="-mx-3 sm:-mx-4 rounded-t-2xl" style={{ backgroundColor: bg, minHeight: "85vh" }}>
      <div className="relative overflow-hidden">
        {/* Subtle glow */}
        <div className="absolute top-0 left-1/3 w-72 h-72 rounded-full blur-[120px] pointer-events-none" style={{ backgroundColor: colorWithAlpha(green, 0.05) }} />

        <div className="relative px-5 sm:px-8 py-12 sm:py-20 max-w-md mx-auto space-y-10">

          <header className="text-center space-y-6">
            {logoUrl ? (
              <div className="inline-block rounded-xl p-4" style={{ backgroundColor: card, border: `1px solid ${border}` }}>
                <Image src={logoUrl} alt={channelName} width={140} height={56} className="object-contain" unoptimized />
              </div>
            ) : (
              <div className="mx-auto w-16 h-16 rounded-xl flex items-center justify-center" style={{ backgroundColor: card, border: `1px solid ${border}` }}>
                <Shield className="h-7 w-7" style={{ color: green }} />
              </div>
            )}
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: heading }}>{channelName}</h1>
              <p className="mt-3 text-base leading-relaxed max-w-xs mx-auto" style={{ color: body }}>{welcomeMessage}</p>
            </div>

            {/* 보안 배지 */}
            <SecurityBadges variant="dark" />
          </header>

          {renderOrderedCards(cardOrder, cards, (children) => <div className="space-y-3">{children}</div>)}

          <div className="text-center pt-4">
            <div className="flex items-center justify-center gap-1.5 text-[11px]" style={{ color: muted }}>
              <Lock className="h-3 w-3" style={{ color: green }} />
              AES-256 암호화 · 익명 보장 · 보안 채널
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
