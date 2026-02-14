"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, FileText, ClipboardList, CreditCard } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Badge } from "@/components/ui/badge";

interface Stats {
  totalCompanies: number;
  totalUsers: number;
  totalReports: number;
  pendingApplications: number;
  activeSubscriptions: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/admin/stats");
        if (res.ok) setStats(await res.json());
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const cards = [
    { label: "전체 기업", value: stats?.totalCompanies, icon: Building2, href: "/admin/companies", color: "text-blue-500" },
    { label: "전체 사용자", value: stats?.totalUsers, icon: Users, href: "/admin/users", color: "text-green-500" },
    { label: "전체 제보", value: stats?.totalReports, icon: FileText, href: "#", color: "text-purple-500" },
    { label: "대기 신청", value: stats?.pendingApplications, icon: ClipboardList, href: "/admin/applications", color: "text-orange-500" },
    { label: "활성 구독", value: stats?.activeSubscriptions, icon: CreditCard, href: "/admin/subscriptions", color: "text-emerald-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">플랫폼 대시보드</h1>
        <p className="text-muted-foreground">모두의 제보채널 Listen 전체 현황</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <Link key={card.label} href={card.href}>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? "..." : (card.value ?? 0)}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {stats?.pendingApplications ? (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="pt-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ClipboardList className="w-5 h-5 text-orange-500" />
              <span className="font-medium">
                {stats.pendingApplications}건의 대기 중인 서비스 신청이 있습니다
              </span>
            </div>
            <Link href="/admin/applications">
              <Badge variant="outline">검토하기</Badge>
            </Link>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
