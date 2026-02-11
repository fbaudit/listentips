"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { Link } from "@/i18n/routing";

interface DashboardStats {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  recentReports: Array<{
    id: string;
    report_number: string;
    title: string;
    status: { name: string; color: string } | null;
    created_at: string;
  }>;
}

export default function CompanyDashboardPage() {
  const t = useTranslations("company");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/reports?limit=10&summary=true");
        if (res.ok) {
          const data = await res.json();
          setStats({
            total: data.total || 0,
            pending: data.pendingCount || 0,
            inProgress: data.inProgressCount || 0,
            resolved: data.resolvedCount || 0,
            recentReports: data.reports || [],
          });
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const statCards = [
    { label: "총 제보", value: stats?.total || 0, icon: FileText, color: "text-blue-500" },
    { label: "대기 중", value: stats?.pending || 0, icon: Clock, color: "text-yellow-500" },
    { label: "처리 중", value: stats?.inProgress || 0, icon: AlertTriangle, color: "text-orange-500" },
    { label: "완료", value: stats?.resolved || 0, icon: CheckCircle2, color: "text-green-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
        <p className="text-muted-foreground">{t("dashboard.description")}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : card.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle>최근 제보</CardTitle>
          <CardDescription>최근 접수된 제보 목록입니다</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">로딩 중...</p>
          ) : stats?.recentReports?.length ? (
            <div className="space-y-3">
              {stats.recentReports.map((report) => (
                <Link
                  key={report.id}
                  href={`/company/reports/${report.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-muted-foreground">
                      {report.report_number}
                    </span>
                    <span className="text-sm font-medium">{report.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" style={report.status?.color ? { backgroundColor: report.status.color, color: "#fff" } : {}}>
                      {report.status?.name || "접수"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(report.created_at).toLocaleDateString("ko")}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-8">
              아직 접수된 제보가 없습니다
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
