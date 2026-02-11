"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";

export interface CaptchaWidgetRef {
  reset: () => void;
}

interface CaptchaWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact";
        }
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

export const CaptchaWidget = forwardRef<CaptchaWidgetRef, CaptchaWidgetProps>(
  function CaptchaWidget({ onVerify, onExpire }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
        }
      },
    }));

    useEffect(() => {
      if (!siteKey) return;

      function renderWidget() {
        if (!containerRef.current || !window.turnstile) return;
        if (widgetIdRef.current) return;

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey!,
          callback: onVerify,
          "expired-callback": onExpire,
          theme: "auto",
          size: "normal",
        });
      }

      if (window.turnstile) {
        renderWidget();
        return;
      }

      const existingScript = document.querySelector(
        'script[src*="challenges.cloudflare.com/turnstile"]'
      );
      if (!existingScript) {
        window.onloadTurnstileCallback = renderWidget;
        const script = document.createElement("script");
        script.src =
          "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback";
        script.async = true;
        document.head.appendChild(script);
      } else {
        const check = setInterval(() => {
          if (window.turnstile) {
            clearInterval(check);
            renderWidget();
          }
        }, 100);
        return () => clearInterval(check);
      }

      return () => {
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [siteKey]);

    if (!siteKey) return null;

    return <div ref={containerRef} className="flex justify-center" />;
  }
);
