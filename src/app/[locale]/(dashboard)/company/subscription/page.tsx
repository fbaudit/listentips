"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PLANS } from "@/lib/constants/plans";
import { CheckCircle2, CreditCard } from "lucide-react";

interface Subscription {
  id: string;
  plan_type: string;
  status: string;
  start_date: string;
  end_date: string;
  amount: number;
  currency: string;
}

export default function CompanySubscriptionPage() {
  const t = useTranslations("company");
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSub() {
      try {
        const res = await fetch("/api/subscriptions");
        if (res.ok) {
          const data = await res.json();
          setSubscription(data.subscription);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchSub();
  }, []);

  const handleUpgrade = async (planType: string) => {
    // For Korean users, use Toss; for international, use Stripe
    const locale = document.documentElement.lang || "ko";
    const isKorean = locale === "ko";

    if (isKorean) {
      // TODO: Initialize Toss Payments widget
      alert("Toss Payments 결제 위젯이 여기에 표시됩니다");
    } else {
      try {
        const res = await fetch("/api/payments/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planType, locale }),
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("subscription.title")}</h1>
        <p className="text-muted-foreground">{t("subscription.description")}</p>
      </div>

      {/* Current Plan */}
      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              현재 요금제
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant="default" className="text-base px-3 py-1">
                {PLANS[subscription.plan_type as keyof typeof PLANS]?.name.ko || subscription.plan_type}
              </Badge>
              <Badge variant={subscription.status === "active" ? "default" : "secondary"}>
                {subscription.status === "active" ? "활성" : subscription.status}
              </Badge>
            </div>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">시작일</span>
                <span>{new Date(subscription.start_date).toLocaleDateString("ko")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">만료일</span>
                <span>{new Date(subscription.end_date).toLocaleDateString("ko")}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan Comparison */}
      <div className="grid gap-6 sm:grid-cols-3">
        {Object.entries(PLANS).map(([key, plan]) => {
          const isCurrent = subscription?.plan_type === key;
          return (
            <Card key={key} className={isCurrent ? "border-primary" : ""}>
              <CardHeader className="text-center">
                <CardTitle>{plan.name.ko}</CardTitle>
                <div className="text-2xl font-bold mt-2">
                  {plan.price.KRW === 0
                    ? "무료"
                    : `₩${plan.price.KRW.toLocaleString()}`}
                </div>
                {key !== "free_trial" && (
                  <p className="text-xs text-muted-foreground">
                    {key === "monthly" ? "/ 월" : "/ 년"}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.ko.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={isCurrent ? "outline" : "default"}
                  disabled={isCurrent || key === "free_trial"}
                  onClick={() => handleUpgrade(key)}
                >
                  {isCurrent ? "현재 플랜" : "업그레이드"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
