"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Shield, Lock, Globe, BarChart3, MessageSquare, Bot, CheckCircle2, ArrowRight } from "lucide-react";
import { PLANS } from "@/lib/constants/plans";
import { MarketingHeader } from "@/components/layout/marketing-header";
import { MarketingFooter } from "@/components/layout/marketing-footer";

const FEATURES = [
  { icon: Shield, key: "anonymous" },
  { icon: Lock, key: "dedicated" },
  { icon: Bot, key: "ai" },
  { icon: Globe, key: "multilang" },
  { icon: MessageSquare, key: "realtime" },
  { icon: BarChart3, key: "dashboard" },
];

export default function LandingPage() {
  const t = useTranslations("landing");

  return (
    <div className="flex flex-col min-h-screen">
      <MarketingHeader />
      <main className="flex-1">
      {/* Hero */}
      <section className="relative py-20 lg:py-32 text-center px-4">
        <div className="container max-w-4xl mx-auto space-y-6">
          <Badge variant="secondary" className="text-sm px-4 py-1">
            Trusted by 100+ organizations
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight lg:whitespace-nowrap">
            {t("hero.title")}
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("hero.subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button asChild size="lg" className="text-base">
              <Link href="/apply">
                {t("hero.cta")}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-muted/30 px-4" id="features">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">{t("features.title")}</h2>
            <p className="text-muted-foreground mt-2">{t("features.subtitle")}</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                    <f.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{t(`features.${f.key}.title`)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">{t(`features.${f.key}.description`)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 px-4" id="pricing">
        <div className="container max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">{t("pricing.title")}</h2>
            <p className="text-muted-foreground mt-2">{t("pricing.subtitle")}</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {Object.entries(PLANS).map(([key, plan]) => {
              const isMonthly = key === "monthly" || key === "premium_monthly";
              const isYearly = key === "yearly" || key === "premium_yearly";
              const isPremiumMonthly = key === "premium_monthly";
              return (
                <Card
                  key={key}
                  className={isPremiumMonthly ? "border-primary shadow-md relative" : ""}
                >
                  {isPremiumMonthly && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                      {t("pricing.popular")}
                    </Badge>
                  )}
                  <CardHeader className="text-center">
                    <CardTitle className="text-lg">{plan.name.ko}</CardTitle>
                    <div className="text-2xl font-bold mt-2">
                      {plan.price.KRW === 0
                        ? t("pricing.freeTrial")
                        : `₩${plan.price.KRW.toLocaleString()}`}
                    </div>
                    {key !== "free_trial" && (
                      <p className="text-sm text-muted-foreground">
                        {isMonthly ? t("pricing.perMonth") : isYearly ? t("pricing.perYear") : ""}
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
                      asChild
                      className="w-full"
                      variant={isPremiumMonthly ? "default" : "outline"}
                    >
                      <Link href="/apply">{t("pricing.startFreeTrial")}</Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-muted/30 px-4">
        <div className="container max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">{t("faq.title")}</h2>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {[1, 2, 3, 4].map((i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger>{t(`faq.q${i}`)}</AccordionTrigger>
                <AccordionContent>{t(`faq.a${i}`)}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 text-center">
        <div className="container max-w-2xl mx-auto space-y-6">
          <h2 className="text-3xl font-bold">{t("cta.title")}</h2>
          <p className="text-muted-foreground text-lg">{t("cta.subtitle")}</p>
          <Button asChild size="lg" className="text-base">
            <Link href="/apply">
              {t("cta.button")}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
