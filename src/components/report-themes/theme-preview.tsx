"use client";

import { ChannelThemeRenderer } from "./index";
import type { ChannelTheme } from "./types";
import { THEME_OPTIONS, DEFAULT_CARD_ORDER } from "./types";

interface ThemePreviewProps {
  theme: ChannelTheme;
  primaryColor: string;
  channelName: string;
  logoUrl: string | null;
}

export function ThemePreview({ theme, primaryColor, channelName, logoUrl }: ThemePreviewProps) {
  const mockT = (key: string) => {
    const map: Record<string, string> = {
      submitButton: "제보하기",
      checkButton: "제보 확인",
      title: "익명 제보 채널",
      description: "안전하고 투명한 제보를 위한 채널입니다",
    };
    return map[key] || key;
  };

  const themeLabel = THEME_OPTIONS.find((o) => o.value === theme)?.label || theme;

  return (
    <div className="rounded-xl border bg-background overflow-hidden">
      <div className="text-xs font-medium text-muted-foreground px-3 py-2 bg-muted/50 border-b flex items-center justify-between">
        <span>미리보기</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted">{themeLabel}</span>
      </div>
      {/* Scaled preview container */}
      <div className="relative overflow-hidden" style={{ height: 440 }}>
        <div
          className="origin-top-left absolute pointer-events-none"
          style={{ transform: "scale(0.52)", width: "192%", height: "192%" }}
        >
          <div className="px-3 py-6 max-w-3xl mx-auto">
            <ChannelThemeRenderer
              theme={theme}
              channelName={channelName || "익명 제보 채널"}
              welcomeMessage="안전하고 투명한 제보를 위한 채널입니다"
              logoUrl={logoUrl}
              primaryColor={primaryColor || "#1a1a2e"}
              companyCode="PREVIEW"
              contentBlocks={[
                { id: "p1", content: "<p><strong>이용 안내</strong></p><p>본 채널을 통해 접수된 모든 제보는 암호화되어 비밀이 보장됩니다.</p>", order: 0 },
              ]}
              cardOrder={DEFAULT_CARD_ORDER}
              useChatbot={false}
              t={mockT}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
