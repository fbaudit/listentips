"use client";

import { useEffect, useState } from "react";
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
      case "free_trial": return "무료 체험";
      case "monthly": return "월간 구독";
      case "yearly": return "연간 구독";
      case "premium_monthly": return "프리미엄 월간";
      case "premium_yearly": return "프리미엄 연간";
      default: return plan;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">구독 관리</h1>
        <p className="text-muted-foreground">전체 기업의 구독 현황을 관리합니다</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>기업</TableHead>
                <TableHead>요금제</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>결제</TableHead>
                <TableHead>시작일</TableHead>
                <TableHead>만료일</TableHead>
                <TableHead>금액</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">로딩 중...</TableCell></TableRow>
              ) : subscriptions.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">구독이 없습니다</TableCell></TableRow>
              ) : (
                subscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.companies?.name || "-"}</TableCell>
                    <TableCell><Badge variant="outline">{planLabel(sub.plan_type)}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={sub.status === "active" ? "default" : "secondary"}>
                        {sub.status === "active" ? "활성" : sub.status === "cancelled" ? "취소" : sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{sub.payment_provider || "-"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(sub.start_date).toLocaleDateString("ko")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(sub.end_date).toLocaleDateString("ko")}
                    </TableCell>
                    <TableCell className="font-mono">
                      {sub.amount > 0 ? `${sub.currency} ${sub.amount.toLocaleString()}` : "무료"}
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
