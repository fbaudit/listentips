"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validators/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Shield, ArrowLeft, Mail, Smartphone } from "lucide-react";
import { CaptchaWidget, type CaptchaWidgetRef } from "@/components/shared/captcha-widget";

type LoginStep = "credentials" | "verification";

export default function CompanyLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [error, setError] = useState<string | null>(
    searchParams.get("error") ? "로그인에 실패했습니다. 다시 시도해주세요." : null
  );
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<CaptchaWidgetRef>(null);

  // Platform login settings
  const [captchaEnabled, setCaptchaEnabled] = useState(true);

  // 2FA state
  const [loginStep, setLoginStep] = useState<LoginStep>("credentials");
  const [verificationCode, setVerificationCode] = useState("");
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [maskedMobile, setMaskedMobile] = useState<string | null>(null);
  const [sentVia, setSentVia] = useState<string>("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [savedCredentials, setSavedCredentials] = useState<LoginInput | null>(null);

  // Fetch login settings
  useEffect(() => {
    fetch("/api/auth/login-settings")
      .then((r) => r.json())
      .then((data) => {
        setCaptchaEnabled(data.captcha_enabled ?? true);
      })
      .catch(() => {});
  }, []);

  // If already logged in as company_admin, redirect to dashboard
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "company_admin") {
      router.replace("/company/dashboard");
    }
  }, [session, status, router]);

  // Resend cooldown timer
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

  const onSubmit = async (data: LoginInput) => {
    setError(null);

    // Step 1: Verify via login API (CAPTCHA + rate limiting) → sends 2FA code
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
        setError(verifyData.error || "로그인에 실패했습니다");
        resetCaptcha();
        return;
      }

      // 2FA disabled — sign in directly
      if (verifyData.directLogin) {
        const result = await signIn("credentials", {
          username: data.username,
          password: data.password,
          redirect: false,
        });
        if (result?.error) {
          setError("로그인에 실패했습니다. 다시 시도해주세요.");
          resetCaptcha();
          return;
        }
        window.location.href = "/company/dashboard";
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
      setError("서버에 연결할 수 없습니다");
      resetCaptcha();
      return;
    }
  };

  const handleVerifyCode = async () => {
    if (!userId || !verificationCode || !savedCredentials) return;
    setError(null);
    setVerifyingCode(true);

    try {
      // Verify the code
      const codeRes = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code: verificationCode }),
      });

      const codeData = await codeRes.json();
      if (!codeRes.ok) {
        setError(codeData.error || "인증에 실패했습니다");
        setVerifyingCode(false);
        return;
      }

      // Step 3: Sign in via NextAuth
      const result = await signIn("credentials", {
        username: savedCredentials.username,
        password: savedCredentials.password,
        verificationCode,
        redirect: false,
      });

      if (result?.error) {
        setError("로그인에 실패했습니다. 다시 시도해주세요.");
        setVerifyingCode(false);
        return;
      }

      // Full page reload to pick up new session
      window.location.href = "/company/dashboard";
    } catch {
      setError("서버에 연결할 수 없습니다");
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
        setError(data.error || "재발송에 실패했습니다");
      }
    } catch {
      setError("서버에 연결할 수 없습니다");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 w-full">
      <Card className="w-full max-w-[400px]">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">기업 관리자 로그인</CardTitle>
          <CardDescription>
            {loginStep === "credentials" ? "제보 관리 시스템에 접속합니다" : "인증번호를 입력해주세요"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loginStep === "credentials" ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">아이디 (이메일)</Label>
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
                <Label htmlFor="password">비밀번호</Label>
                <Input
                  id="password"
                  type="password"
                  {...register("password")}
                  placeholder="비밀번호를 입력하세요"
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
                로그인
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Sent info */}
              <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                <p className="font-medium">인증번호가 발송되었습니다</p>
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

              {/* Verification code input */}
              <div className="space-y-2">
                <Label htmlFor="verificationCode">인증번호 (6자리)</Label>
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
                인증 확인
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
                  돌아가기
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleResend("email")}
                  disabled={resendCooldown > 0}
                >
                  {resendCooldown > 0 ? `재발송 (${resendCooldown}초)` : "인증번호 재발송"}
                </Button>
              </div>

              {/* SMS 대체 인증 */}
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
                    SMS로 인증번호 받기 ({maskedMobile})
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
