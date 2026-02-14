"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Search } from "lucide-react";
import { reportCheckSchema, type ReportCheckInput } from "@/lib/validators/report";

export default function ReportCheckPage() {
  const t = useTranslations("report.check");
  const params = useParams();
  const router = useRouter();
  const companyCode = params.companyCode as string;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const form = useForm<ReportCheckInput>({
    resolver: zodResolver(reportCheckSchema),
    defaultValues: { reportNumber: "", password: "" },
  });

  async function onSubmit(data: ReportCheckInput) {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/report-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, companyCode }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(t("notFound"));
        return;
      }

      // Store token in sessionStorage for subsequent requests
      sessionStorage.setItem(`report_token_${data.reportNumber}`, result.token);
      router.push(`/report/${companyCode}/check/${data.reportNumber}`);
    } catch {
      setError(t("notFound"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
          <Search className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reportNumber">{t("reportNumber")}</Label>
            <Input
              id="reportNumber"
              {...form.register("reportNumber")}
              placeholder="ABCD1234"
              maxLength={8}
              className="text-center text-lg tracking-wider font-mono uppercase"
            />
            {form.formState.errors.reportNumber && (
              <p className="text-sm text-destructive">{form.formState.errors.reportNumber.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("password")}</Label>
            <Input
              id="password"
              type="password"
              {...form.register("password")}
            />
            {form.formState.errors.password && (
              <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {t("checkButton")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
