"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
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
  const t = useTranslations("company.subscription");
  const locale = useLocale() as "ko" | "en" | "ja" | "zh";
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
      alert(t("tossPaymentAlert"));
    } else {
      try {
        const res = await fetch("/api/payments/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planType, locale }),
        });
        const data = await res.json();
        if (data.url && (data.url.startsWith("/") || data.url.startsWith("https://api.tosspayments.com") || data.url.startsWith("https://checkout.stripe.com"))) {
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
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      {/* Current Plan */}
      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              {t("currentPlan")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant="default" className="text-base px-3 py-1">
                {PLANS[subscription.plan_type as keyof typeof PLANS]?.name[locale] || subscription.plan_type}
              </Badge>
              <Badge variant={subscription.status === "active" ? "default" : "secondary"}>
                {subscription.status === "active" ? t("active") : subscription.status}
              </Badge>
            </div>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("startDate")}</span>
                <span>{new Date(subscription.start_date).toLocaleDateString(locale)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("expiryDate")}</span>
                <span>{new Date(subscription.end_date).toLocaleDateString(locale)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan Comparison */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Object.entries(PLANS).map(([key, plan]) => {
          const isCurrent = subscription?.plan_type === key;
          const isMonthly = key === "monthly" || key === "premium_monthly";
          const isYearly = key === "yearly" || key === "premium_yearly";
          return (
            <Card key={key} className={isCurrent ? "border-primary" : ""}>
              <CardHeader className="text-center">
                <CardTitle className="text-lg">{plan.name[locale]}</CardTitle>
                <div className="text-2xl font-bold mt-2">
                  {plan.price.KRW === 0
                    ? t("free")
                    : `₩${plan.price.KRW.toLocaleString()}`}
                </div>
                {key !== "free_trial" && (
                  <p className="text-xs text-muted-foreground">
                    {isMonthly ? t("perMonth") : isYearly ? t("perYear") : ""}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features[locale].map((feature, i) => (
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
                  {isCurrent ? t("currentPlan") : t("upgrade")}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
