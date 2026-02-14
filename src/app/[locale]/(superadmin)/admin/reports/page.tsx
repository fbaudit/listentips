"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/routing";

interface Report {
  id: string;
  report_number: string;
  title: string;
  created_at: string;
  company_id: string;
  company: { name: string; code: string } | null;
  report_type: { name: string } | null;
  status: { name: string; color: string } | null;
}

interface CompanyOption {
  id: string;
  name: string;
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Load companies for filter dropdown
  useEffect(() => {
    async function fetchCompanies() {
      try {
        const res = await fetch("/api/companies?limit=100");
        if (res.ok) {
          const data = await res.json();
          setCompanies(
            (data.companies || []).map((c: { id: string; name: string }) => ({
              id: c.id,
              name: c.name,
            }))
          );
        }
      } catch {
        // ignore
      }
    }
    fetchCompanies();
  }, []);

  useEffect(() => {
    async function fetchReports() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: page.toString(), limit: "20" });
        if (search) params.set("search", search);
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (companyFilter !== "all") params.set("companyId", companyFilter);

        const res = await fetch(`/api/admin/reports?${params}`);
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
  }, [page, search, statusFilter, companyFilter]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">제보 관리</h1>
        <p className="text-muted-foreground">전체 기업의 제보를 관리합니다</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="접수번호 또는 제목 검색..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={companyFilter} onValueChange={(v) => { setCompanyFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="기업 필터" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 기업</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="상태 필터" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            <SelectItem value="접수">접수</SelectItem>
            <SelectItem value="검토중">검토중</SelectItem>
            <SelectItem value="조사중">조사중</SelectItem>
            <SelectItem value="완료">완료</SelectItem>
            <SelectItem value="종결">종결</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>접수번호</TableHead>
                <TableHead>기업명</TableHead>
                <TableHead>제목</TableHead>
                <TableHead>유형</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>접수일</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">로딩 중...</TableCell>
                </TableRow>
              ) : reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">제보가 없습니다</TableCell>
                </TableRow>
              ) : (
                reports.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono">
                      <Link href={`/admin/reports/${r.id}`} className="text-primary hover:underline">
                        {r.report_number}
                      </Link>
                    </TableCell>
                    <TableCell>{r.company?.name || "-"}</TableCell>
                    <TableCell className="font-medium max-w-[300px] truncate">
                      {r.title}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.report_type?.name || "-"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        style={r.status?.color ? { backgroundColor: r.status.color, color: "#fff" } : {}}
                      >
                        {r.status?.name || "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("ko")}
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm">{page} / {totalPages}</span>
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
