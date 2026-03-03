"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validators/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldAlert, ArrowLeft, Mail, Smartphone } from "lucide-react";
import { CaptchaWidget, type CaptchaWidgetRef } from "@/components/shared/captcha-widget";

type LoginStep = "credentials" | "verification";

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const t = useTranslations("admin.login");
  const ta = useTranslations("auth");
  const tc = useTranslations("common");
  const debugReason = searchParams.get("debug");
  const [error, setError] = useState<string | null>(
    debugReason
      ? t("debugFail", { reason: debugReason })
      : searchParams.get("error")
        ? ta("loginFailed")
        : null
  );
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<CaptchaWidgetRef>(null);

  const [captchaEnabled, setCaptchaEnabled] = useState(true);

  const [loginStep, setLoginStep] = useState<LoginStep>("credentials");
  const [verificationCode, setVerificationCode] = useState("");
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [maskedMobile, setMaskedMobile] = useState<string | null>(null);
  const [sentVia, setSentVia] = useState<string>("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [savedCredentials, setSavedCredentials] = useState<LoginInput | null>(null);

  useEffect(() => {
    fetch("/api/auth/login-settings")
      .then((r) => r.json())
      .then((data) => {
        setCaptchaEnabled(data.captcha_enabled ?? true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "super_admin") {
      router.replace("/admin/dashboard");
    }
  }, [session, status, router]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const handleCaptchaVerify = useCallback((token: string) => {
    setCaptchaToken(token);
  }, []);

  const handleCaptchaExpire = useCallback(() => {
    setCaptchaToken(null);
  }, []);

  const resetCaptcha = useCallback(() => {
    setCaptchaToken(null);
    captchaRef.current?.reset();
  }, []);

  const signInAdmin = async (creds: LoginInput, code?: string) => {
    const csrfRes = await fetch("/api/auth/admin/csrf");
    const csrfData = await csrfRes.json();

    const params: Record<string, string> = {
      username: creds.username,
      password: creds.password,
      csrfToken: csrfData.csrfToken,
      callbackUrl: window.location.href,
    };
    if (code) params.verificationCode = code;

    const signInRes = await fetch("/api/auth/admin/callback/credentials", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Auth-Return-Redirect": "1",
      },
      body: new URLSearchParams(params),
    });

    const signInData = await signInRes.json();

    if (signInData.url) {
      try {
        const urlError = new URL(signInData.url).searchParams.get("error");
        if (urlError) return { error: ta("loginFailed") };
      } catch { /* ignore */ }
    }

    if (!signInRes.ok) {
      return { error: ta("loginError") };
    }

    const sessionCheck = await fetch("/api/auth/admin/session");
    const sessionData = await sessionCheck.json();
    if (!sessionData?.user) {
      return { error: t("sessionFailed") };
    }

    return { success: true };
  };

  const onSubmit = async (data: LoginInput) => {
    setError(null);

    try {
      const verifyRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: data.username,
          password: data.password,
          captchaToken,
        }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        setError(verifyData.error || ta("loginError"));
        resetCaptcha();
        return;
      }

      if (verifyData.directLogin) {
        const result = await signInAdmin(data);
        if (result.error) {
          setError(result.error);
          resetCaptcha();
          return;
        }
        window.location.href = "/admin/dashboard";
        return;
      }

      if (verifyData.requiresVerification) {
        setUserId(verifyData.userId);
        setMaskedEmail(verifyData.maskedEmail);
        setMaskedMobile(verifyData.maskedMobile);
        setSentVia(verifyData.sentVia || "");
        setSavedCredentials(data);
        setLoginStep("verification");
        setResendCooldown(120);
        return;
      }
    } catch {
      setError(ta("serverError"));
      resetCaptcha();
      return;
    }
  };

  const handleVerifyCode = async () => {
    if (!userId || !verificationCode || !savedCredentials) return;
    setError(null);
    setVerifyingCode(true);

    try {
      const codeRes = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code: verificationCode }),
      });

      const codeData = await codeRes.json();
      if (!codeRes.ok) {
        setError(codeData.error || ta("verificationFailed"));
        setVerifyingCode(false);
        return;
      }

      const result = await signInAdmin(savedCredentials, verificationCode);
      if (result.error) {
        setError(result.error);
        setVerifyingCode(false);
        return;
      }

      window.location.href = "/admin/dashboard";
    } catch {
      setError(ta("serverError"));
      setVerifyingCode(false);
    }
  };

  const handleResend = async (channel: "email" | "sms" = "email") => {
    if (resendCooldown > 0 || !savedCredentials) return;
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: savedCredentials.username,
          password: savedCredentials.password,
          captchaToken,
          channel,
        }),
      });
      const data = await res.json();
      if (res.ok && data.requiresVerification) {
        setSentVia(data.sentVia || "");
        setResendCooldown(120);
      } else if (!res.ok) {
        setError(data.error || ta("resendFailed"));
      }
    } catch {
      setError(ta("serverError"));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center mb-2">
            <ShieldAlert className="w-6 h-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl">{t("superAdminTitle")}</CardTitle>
          <CardDescription>
            {loginStep === "credentials" ? t("description") : ta("enterVerification")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loginStep === "credentials" ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">{ta("usernameLabel")}</Label>
                <Input
                  id="username"
                  type="email"
                  {...register("username")}
                  placeholder="user@example.com"
                  autoComplete="username"
                />
                {errors.username && (
                  <p className="text-sm text-destructive">{errors.username.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{ta("passwordLabel")}</Label>
                <Input
                  id="password"
                  type="password"
                  {...register("password")}
                  placeholder={ta("passwordPlaceholder")}
                  autoComplete="current-password"
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>
              {captchaEnabled && (
                <CaptchaWidget
                  ref={captchaRef}
                  onVerify={handleCaptchaVerify}
                  onExpire={handleCaptchaExpire}
                />
              )}
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {tc("login")}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                <p className="font-medium">{ta("verificationSent")}</p>
                {sentVia.includes("email") && maskedEmail && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span>{maskedEmail}</span>
                  </div>
                )}
                {sentVia.includes("sms") && maskedMobile && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Smartphone className="w-4 h-4" />
                    <span>{maskedMobile}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="verificationCode">{ta("verificationLabel")}</Label>
                <Input
                  id="verificationCode"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="text-center text-2xl tracking-[0.5em] font-mono"
                  autoFocus
                  autoComplete="one-time-code"
                />
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button
                onClick={handleVerifyCode}
                className="w-full"
                disabled={verifyingCode || verificationCode.length !== 6}
              >
                {verifyingCode && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {ta("verifyButton")}
              </Button>

              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setLoginStep("credentials");
                    setVerificationCode("");
                    setError(null);
                  }}
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  {ta("goBack")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleResend("email")}
                  disabled={resendCooldown > 0}
                >
                  {resendCooldown > 0 ? ta("resendCountdown", { seconds: resendCooldown }) : ta("resend")}
                </Button>
              </div>

              {maskedMobile && !sentVia.includes("sms") && (
                <div className="border-t pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleResend("sms")}
                    disabled={resendCooldown > 0}
                  >
                    <Smartphone className="w-4 h-4 mr-2" />
                    {ta("smsVerification", { phone: maskedMobile })}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
