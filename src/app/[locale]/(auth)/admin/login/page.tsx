"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validators/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldAlert } from "lucide-react";
import { CaptchaWidget, type CaptchaWidgetRef } from "@/components/shared/captcha-widget";

export default function AdminLoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<CaptchaWidgetRef>(null);

  // If already logged in as super_admin, redirect to dashboard
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "super_admin") {
      router.replace("/admin/dashboard");
    }
  }, [session, status, router]);

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

    // Step 1: Verify via login API (CAPTCHA + rate limiting)
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
    } catch {
      setError("서버에 연결할 수 없습니다");
      resetCaptcha();
      return;
    }

    // Step 2: Sign in via NextAuth
    const result = await signIn("credentials", {
      username: data.username,
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      setError("아이디 또는 비밀번호가 일치하지 않습니다");
      resetCaptcha();
      return;
    }

    router.push("/admin/dashboard");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center mb-2">
            <ShieldAlert className="w-6 h-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl">슈퍼 관리자 로그인</CardTitle>
          <CardDescription>플랫폼 관리 시스템에 접속합니다</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">아이디</Label>
              <Input
                id="username"
                {...register("username")}
                placeholder="관리자 아이디"
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
                placeholder="비밀번호"
                autoComplete="current-password"
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            <CaptchaWidget
              ref={captchaRef}
              onVerify={handleCaptchaVerify}
              onExpire={handleCaptchaExpire}
            />
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
        </CardContent>
      </Card>
    </div>
  );
}
