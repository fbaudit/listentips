"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

interface Report {
  id: string;
  report_number: string;
  title: string;
  status: { name: string; color: string } | null;
  report_type: { name: string } | null;
  created_at: string;
}

export default function CompanyReportsPage() {
  const t = useTranslations("company");
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReports() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "20",
        });
        if (search) params.set("search", search);
        if (statusFilter !== "all") params.set("status", statusFilter);

        const res = await fetch(`/api/reports?${params}`);
        if (res.ok) {
          const data = await res.json();
          setReports(data.reports || []);
          setTotal(data.total || 0);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchReports();
  }, [page, search, statusFilter]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("reports.title")}</h1>
        <p className="text-muted-foreground">{t("reports.description")}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="제보 검색..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="상태 필터" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="접수">접수</SelectItem>
            <SelectItem value="검토중">검토중</SelectItem>
            <SelectItem value="조사중">조사중</SelectItem>
            <SelectItem value="완료">완료</SelectItem>
            <SelectItem value="종결">종결</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>접수번호</TableHead>
                <TableHead>제목</TableHead>
                <TableHead>유형</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>접수일</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    로딩 중...
                  </TableCell>
                </TableRow>
              ) : reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    제보가 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <Link
                        href={`/company/reports/${report.id}`}
                        className="font-mono text-primary hover:underline"
                      >
                        {report.report_number}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">{report.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{report.report_type?.name || "-"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        style={report.status?.color ? { backgroundColor: report.status.color, color: "#fff" } : {}}
                      >
                        {report.status?.name || "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(report.created_at).toLocaleDateString("ko")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
