"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Subscription {
  id: string;
  plan_type: string;
  status: string;
  start_date: string;
  end_date: string;
  amount: number;
  currency: string;
  payment_provider: string | null;
  companies: { name: string; company_code: string } | null;
}

export default function AdminSubscriptionsPage() {
  const t = useTranslations("admin.subscriptions");
  const locale = useLocale();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSubs() {
      setLoading(true);
      try {
        const res = await fetch(`/api/subscriptions?page=${page}&limit=20`);
        if (res.ok) {
          const data = await res.json();
          setSubscriptions(data.subscriptions || []);
          setTotal(data.total || 0);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchSubs();
  }, [page]);

  const totalPages = Math.ceil(total / 20);
  const planLabel = (plan: string) => {
    switch (plan) {
      case "free_trial": return t("freeTrial");
      case "monthly": return t("monthly");
      case "yearly": return t("yearly");
      case "premium_monthly": return t("premiumMonthly");
      case "premium_yearly": return t("premiumYearly");
      default: return plan;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("company")}</TableHead>
                <TableHead>{t("plan")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("payment")}</TableHead>
                <TableHead>{t("startDate")}</TableHead>
                <TableHead>{t("endDate")}</TableHead>
                <TableHead>{t("amount")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">{t("loading")}</TableCell></TableRow>
              ) : subscriptions.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">{t("noSubscriptions")}</TableCell></TableRow>
              ) : (
                subscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.companies?.name || "-"}</TableCell>
                    <TableCell><Badge variant="outline">{planLabel(sub.plan_type)}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={sub.status === "active" ? "default" : "secondary"}>
                        {sub.status === "active" ? t("active") : sub.status === "cancelled" ? t("cancelled") : sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{sub.payment_provider || "-"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(sub.start_date).toLocaleDateString(locale)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(sub.end_date).toLocaleDateString(locale)}
                    </TableCell>
                    <TableCell className="font-mono">
                      {sub.amount > 0 ? `${sub.currency} ${sub.amount.toLocaleString()}` : t("free")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
