import type { ChannelTheme, ChannelThemeProps } from "./types";
import { ThemeMinimal } from "./theme-minimal";
import { ThemeBranded } from "./theme-branded";
import { ThemeGlassmorphism } from "./theme-glassmorphism";
import { ThemeCardGrid } from "./theme-card-grid";
import { ThemeDarkSecure } from "./theme-dark-secure";

export type { ChannelTheme, ChannelThemeProps };
export { THEME_OPTIONS } from "./types";

/**
 * Theme mapping:
 * - minimal     → 미니멀 모던 (ThemeMinimal)
 * - warm        → 따뜻한 감성 (ThemeBranded)
 * - dark-elegant → 다크 엘레간트 (ThemeGlassmorphism)
 * - futuristic  → 테크 퓨처리스틱 (ThemeCardGrid)
 * - vibrant     → 비비드 컬러풀 (ThemeDarkSecure)
 *
 * Legacy theme names are mapped to the closest new theme:
 * - branded      → warm
 * - glassmorphism → dark-elegant
 * - card-grid    → futuristic
 * - dark-secure  → vibrant
 */
export function ChannelThemeRenderer({ theme, ...props }: ChannelThemeProps & { theme: ChannelTheme | string }) {
  switch (theme) {
    case "warm":
    case "branded":
      return <ThemeBranded {...props} />;
    case "dark-elegant":
    case "glassmorphism":
      return <ThemeGlassmorphism {...props} />;
    case "futuristic":
    case "card-grid":
      return <ThemeCardGrid {...props} />;
    case "vibrant":
    case "dark-secure":
      return <ThemeDarkSecure {...props} />;
    case "minimal":
    default:
      return <ThemeMinimal {...props} />;
  }
}
