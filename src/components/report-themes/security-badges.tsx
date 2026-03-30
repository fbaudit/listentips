import { Lock, EyeOff, ShieldCheck, Globe } from "lucide-react";
import { colorWithAlpha } from "./types";

interface SecurityBadgesProps {
  variant: "light" | "dark";
  primaryColor?: string;
}

const BADGES = [
  { icon: Lock, label: "AES-256 암호화", color: "#10b981" },
  { icon: EyeOff, label: "익명 보장", color: "#3b82f6" },
  { icon: ShieldCheck, label: "비식별화 처리", color: "#8b5cf6" },
  { icon: Globe, label: "IP 미수집", color: "#f59e0b" },
];

export function SecurityBadges({ variant }: SecurityBadgesProps) {
  if (variant === "dark") {
    return (
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {BADGES.map(({ icon: Icon, label, color }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full"
            style={{ backgroundColor: colorWithAlpha(color, 0.12), color, border: `1px solid ${colorWithAlpha(color, 0.25)}` }}
          >
            <Icon className="h-3 w-3" />
            {label}
          </span>
        ))}
      </div>
    );
  }

  // Light variant
  return (
    <div className="flex items-center justify-center gap-2 flex-wrap">
      {BADGES.map(({ icon: Icon, label, color }) => (
        <span
          key={label}
          className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full"
          style={{ backgroundColor: colorWithAlpha(color, 0.08), color: colorWithAlpha(color, 1), border: `1px solid ${colorWithAlpha(color, 0.15)}` }}
        >
          <Icon className="h-3 w-3" />
          {label}
        </span>
      ))}
    </div>
  );
}
