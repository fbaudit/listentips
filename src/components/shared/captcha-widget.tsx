"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from "react";

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
          "error-callback"?: () => void;
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
    const [loadError, setLoadError] = useState(false);

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
          "error-callback": () => setLoadError(true),
          theme: "auto",
          size: "normal",
        });
      }

      // Timeout: if Turnstile doesn't load within 10 seconds, show error
      const timeout = setTimeout(() => {
        if (!window.turnstile || !widgetIdRef.current) {
          setLoadError(true);
        }
      }, 10000);

      if (window.turnstile) {
        renderWidget();
        clearTimeout(timeout);
        return () => clearTimeout(timeout);
      }

      const existingScript = document.querySelector(
        'script[src*="challenges.cloudflare.com/turnstile"]'
      );
      if (!existingScript) {
        window.onloadTurnstileCallback = () => {
          clearTimeout(timeout);
          renderWidget();
        };
        const script = document.createElement("script");
        script.src =
          "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback";
        script.async = true;
        script.onerror = () => setLoadError(true);
        document.head.appendChild(script);
      } else {
        const check = setInterval(() => {
          if (window.turnstile) {
            clearInterval(check);
            clearTimeout(timeout);
            renderWidget();
          }
        }, 100);
        return () => {
          clearInterval(check);
          clearTimeout(timeout);
        };
      }

      return () => {
        clearTimeout(timeout);
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [siteKey]);

    if (!siteKey) return null;

    if (loadError) {
      return (
        <div className="text-center text-sm text-muted-foreground py-2">
          <p>보안 인증 로드에 실패했습니다.</p>
          <button
            type="button"
            className="text-primary underline mt-1"
            onClick={() => window.location.reload()}
          >
            페이지 새로고침
          </button>
        </div>
      );
    }

    return <div ref={containerRef} className="flex justify-center" />;
  }
);
