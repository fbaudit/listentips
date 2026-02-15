"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText, Clock, CheckCircle2, AlertTriangle, TrendingUp, TrendingDown,
  Minus, BarChart3, Brain, Globe, Timer, Loader2,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

interface DashboardData {
  summary: {
    total: number;
    pending: number;
    inProgress: number;
    resolved: number;
    avgProcessingHours: number | null;
    aiAvgScore: number | null;
    thisMonth: number;
    lastMonth: number;
  };
  statusDistribution: { name: string; color: string; count: number }[];
  typeDistribution: { name: string; count: number }[];
  monthlyTrend: { month: string; count: number }[];
  dailyTrend: { date: string; count: number }[];
  dayOfWeek: { name: string; count: number }[];
  aiScoreDistribution: { range: string; count: number }[];
  localeDistribution: { name: string; count: number }[];
  topViewed: { id: string; viewCount: number }[];
}

interface RecentReport {
  id: string;
  report_number: string;
  title: string;
  status: { name: string; color: string } | null;
  report_type: { name: string } | null;
  created_at: string;
}

const STATUS_COLORS = ["#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#10b981", "#6366f1", "#ef4444"];
const TYPE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#ef4444", "#06b6d4", "#84cc16"];
const LOCALE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ec4899"];

export default function CompanyDashboardPage() {
  const t = useTranslations("company");
  const [data, setData] = useState<DashboardData | null>(null);
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [dashRes, reportsRes] = await Promise.all([
          fetch("/api/company/dashboard"),
          fetch("/api/reports?limit=10&summary=false"),
        ]);
        if (dashRes.ok) {
          setData(await dashRes.json());
        }
        if (reportsRes.ok) {
          const rData = await reportsRes.json();
          setRecentReports(rData.reports || []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  const summary = data?.summary;

  // Month-over-month change
  const monthChange = summary
    ? summary.lastMonth > 0
      ? Math.round(((summary.thisMonth - summary.lastMonth) / summary.lastMonth) * 100)
      : summary.thisMonth > 0
        ? 100
        : 0
    : 0;

  // Resolution rate
  const resolutionRate = summary && summary.total > 0
    ? Math.round((summary.resolved / summary.total) * 100)
    : 0;

  // Format processing time
  const formatProcessingTime = (hours: number | null) => {
    if (hours === null) return "-";
    if (hours < 24) return `${hours}시간`;
    const days = Math.floor(hours / 24);
    const remainHours = hours % 24;
    return remainHours > 0 ? `${days}일 ${remainHours}시간` : `${days}일`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
        <p className="text-muted-foreground">{t("dashboard.description")}</p>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">총 제보</CardTitle>
            <FileText className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.total || 0}</div>
            <div className="flex items-center gap-1 mt-1">
              {monthChange > 0 ? (
                <TrendingUp className="w-3 h-3 text-green-500" />
              ) : monthChange < 0 ? (
                <TrendingDown className="w-3 h-3 text-red-500" />
              ) : (
                <Minus className="w-3 h-3 text-muted-foreground" />
              )}
              <span className={`text-xs ${monthChange > 0 ? "text-green-500" : monthChange < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                {monthChange > 0 ? "+" : ""}{monthChange}% 전월 대비
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">대기 중</CardTitle>
            <Clock className="w-4 h-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.pending || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">처리 필요</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">처리 중</CardTitle>
            <AlertTriangle className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.inProgress || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">진행 중인 제보</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">완료</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.resolved || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">처리율 {resolutionRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">이번 달 접수</CardTitle>
            <BarChart3 className="w-4 h-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.thisMonth || 0}<span className="text-sm font-normal text-muted-foreground ml-1">건</span></div>
            <p className="text-xs text-muted-foreground mt-1">지난 달 {summary?.lastMonth || 0}건</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">평균 처리 시간</CardTitle>
            <Timer className="w-4 h-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatProcessingTime(summary?.avgProcessingHours ?? null)}</div>
            <p className="text-xs text-muted-foreground mt-1">접수 → 완료 기준</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">AI 검증 평균 점수</CardTitle>
            <Brain className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.aiAvgScore != null ? `${summary.aiAvgScore}%` : "-"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">AI 검증 활용 제보 기준</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1: Trend + Status */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Monthly Trend - Area Chart */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base">월별 제보 추이</CardTitle>
            <CardDescription>최근 12개월간 접수된 제보 건수</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.monthlyTrend && data.monthlyTrend.some((m) => m.count > 0) ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data.monthlyTrend}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => { const parts = v.split("-"); return `${parseInt(parts[1])}월`; }}
                    className="text-muted-foreground"
                  />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                    labelFormatter={(v) => { const parts = v.split("-"); return `${parts[0]}년 ${parseInt(parts[1])}월`; }}
                    formatter={(value: number) => [`${value}건`, "접수"]}
                  />
                  <Area type="monotone" dataKey="count" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCount)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
                데이터가 없습니다
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution - Pie Chart */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">상태별 분포</CardTitle>
            <CardDescription>현재 제보 처리 상태 현황</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.statusDistribution && data.statusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={data.statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="name"
                  >
                    {data.statusDistribution.map((entry, index) => (
                      <Cell key={entry.name} fill={entry.color || STATUS_COLORS[index % STATUS_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                    formatter={(value: number, name: string) => [`${value}건`, name]}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
                데이터가 없습니다
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Daily Trend + Type Distribution */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Daily Trend - Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">일별 제보 추이</CardTitle>
            <CardDescription>최근 30일간 일별 접수 현황</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.dailyTrend && data.dailyTrend.some((d) => d.count > 0) ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    interval={4}
                    className="text-muted-foreground"
                  />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                    formatter={(value: number) => [`${value}건`, "접수"]}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[240px] text-muted-foreground text-sm">
                데이터가 없습니다
              </div>
            )}
          </CardContent>
        </Card>

        {/* Report Type Distribution - Horizontal Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">유형별 분포</CardTitle>
            <CardDescription>제보 유형별 접수 건수</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.typeDistribution && data.typeDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.typeDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} className="text-muted-foreground" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                    formatter={(value: number) => [`${value}건`, "접수"]}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {data.typeDistribution.map((_, index) => (
                      <Cell key={index} fill={TYPE_COLORS[index % TYPE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[240px] text-muted-foreground text-sm">
                데이터가 없습니다
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 3: Day of Week + AI Score + Locale */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Day of Week - Radar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">요일별 접수 패턴</CardTitle>
            <CardDescription>요일별 제보 접수 분포</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.dayOfWeek && data.dayOfWeek.some((d) => d.count > 0) ? (
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={data.dayOfWeek} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid className="stroke-muted" />
                  <PolarAngleAxis dataKey="name" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <PolarRadiusAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <Radar dataKey="count" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} strokeWidth={2} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                    formatter={(value: number) => [`${value}건`, "접수"]}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[240px] text-muted-foreground text-sm">
                데이터가 없습니다
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Validation Score Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="w-4 h-4" />
              AI 검증 점수 분포
            </CardTitle>
            <CardDescription>제보 품질 검증 점수대별 현황</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.aiScoreDistribution && data.aiScoreDistribution.some((d) => d.count > 0) ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.aiScoreDistribution}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="range" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                    formatter={(value: number) => [`${value}건`, "제보"]}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {data.aiScoreDistribution.map((_, index) => {
                      const colors = ["#ef4444", "#f59e0b", "#eab308", "#84cc16", "#10b981"];
                      return <Cell key={index} fill={colors[index]} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[240px] text-muted-foreground text-sm">
                AI 검증 데이터가 없습니다
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reporter Locale Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="w-4 h-4" />
              제보 언어 분포
            </CardTitle>
            <CardDescription>제보자가 사용한 언어별 현황</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.localeDistribution && data.localeDistribution.length > 0 ? (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={data.localeDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={65}
                      paddingAngle={2}
                      dataKey="count"
                      nameKey="name"
                    >
                      {data.localeDistribution.map((_, index) => (
                        <Cell key={index} fill={LOCALE_COLORS[index % LOCALE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                      formatter={(value: number, name: string) => [`${value}건`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 justify-center">
                  {data.localeDistribution.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: LOCALE_COLORS[index % LOCALE_COLORS.length] }} />
                      <span>{item.name}</span>
                      <span className="font-medium">{item.count}건</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[240px] text-muted-foreground text-sm">
                데이터가 없습니다
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle>최근 제보</CardTitle>
          <CardDescription>최근 접수된 제보 목록입니다</CardDescription>
        </CardHeader>
        <CardContent>
          {recentReports.length > 0 ? (
            <div className="space-y-3">
              {recentReports.map((report) => (
                <Link
                  key={report.id}
                  href={`/company/reports/${report.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-sm text-muted-foreground shrink-0">
                      {report.report_number}
                    </span>
                    <span className="text-sm font-medium truncate">{report.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {report.report_type?.name && (
                      <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
                        {report.report_type.name}
                      </Badge>
                    )}
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
