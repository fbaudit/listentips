/**
 * Theme 1: 미니멀 클린
 */
import Link from "next/link";
import Image from "next/image";
import { FileText, Search, Shield, ArrowUpRight } from "lucide-react";
import { sanitizeHtml } from "@/lib/utils/sanitize";
import type { ChannelThemeProps } from "./types";
import { colorWithAlpha } from "./types";
import { renderOrderedCards } from "./card-renderer";
import { SecurityBadges } from "./security-badges";

export function ThemeMinimal({ channelName, welcomeMessage, logoUrl, primaryColor, companyCode, contentBlocks, cardOrder, t }: ChannelThemeProps) {
  const actionCard = (href: string, Icon: typeof FileText, label: string, sub: string) => (
    <Link href={href} className="group">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center space-y-3 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-gray-300">
        <div className="mx-auto w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: colorWithAlpha(primaryColor, 0.07) }}>
          <Icon className="h-5 w-5" style={{ color: primaryColor }} />
        </div>
        <div>
          <p className="font-bold text-sm text-gray-900">{label}</p>
          <p className="text-xs text-gray-500 mt-1">{sub}</p>
        </div>
        <ArrowUpRight className="h-3.5 w-3.5 mx-auto text-gray-300 group-hover:text-gray-500 transition-colors" />
      </div>
    </Link>
  );

  const cards = {
    submit: actionCard(`/report/${companyCode}/submit`, FileText, t("submitButton"), "익명으로 안전하게"),
    check: actionCard(`/report/${companyCode}/check`, Search, t("checkButton"), "접수번호로 확인"),
    content: contentBlocks.length > 0 ? (
      <div className="space-y-4">
        {contentBlocks.map((block) => (
          <div key={block.id} className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="text-sm max-w-none [&_*]:!text-inherit [&_p]:my-2 [&_p]:leading-relaxed [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1" style={{ color: "#4b5563" }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.content) }} />
          </div>
        ))}
      </div>
    ) : null,
  };

  return (
    <div className="py-12 sm:py-20 px-2">
      <div className="max-w-md mx-auto space-y-10">
        <header className="text-center space-y-6">
          {logoUrl ? (
            <Image src={logoUrl} alt={channelName} width={160} height={64} className="object-contain mx-auto" unoptimized />
          ) : (
            <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: colorWithAlpha(primaryColor, 0.07) }}>
              <Shield className="h-7 w-7" style={{ color: primaryColor }} />
            </div>
          )}
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">{channelName}</h1>
            <p className="mt-3 text-gray-600 text-base leading-relaxed max-w-xs mx-auto">{welcomeMessage}</p>
          </div>
        </header>
        <SecurityBadges variant="light" />
        {renderOrderedCards(cardOrder, cards, (children) => <div className="grid grid-cols-2 gap-4">{children}</div>)}
      </div>
    </div>
  );
}
