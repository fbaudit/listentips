"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

interface Company {
  id: string;
  name: string;
  company_code: string;
  industry: string | null;
  is_active: boolean;
  service_end: string | null;
  created_at: string;
}

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCompanies() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: page.toString(), limit: "20" });
        if (search) params.set("search", search);
        const res = await fetch(`/api/companies?${params}`);
        if (res.ok) {
          const data = await res.json();
          setCompanies(data.companies || []);
          setTotal(data.total || 0);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchCompanies();
  }, [page, search]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">기업 관리</h1>
        <p className="text-muted-foreground">등록된 기업을 관리합니다</p>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="기업 검색..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>기업명</TableHead>
                <TableHead>코드</TableHead>
                <TableHead>업종</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>서비스 만료</TableHead>
                <TableHead>제보 URL</TableHead>
                <TableHead>관리자 URL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">로딩 중...</TableCell></TableRow>
              ) : companies.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">기업이 없습니다</TableCell></TableRow>
              ) : (
                companies.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="font-mono">{c.company_code}</TableCell>
                    <TableCell>{c.industry || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={c.is_active ? "default" : "secondary"}>
                        {c.is_active ? "활성" : "비활성"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.service_end ? new Date(c.service_end).toLocaleDateString("ko") : "-"}
                    </TableCell>
                    <TableCell>
                      <a
                        href={`/report/${c.company_code}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        /report/{c.company_code}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </TableCell>
                    <TableCell>
                      <a
                        href={`/company/dashboard`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        관리자 페이지
                        <ExternalLink className="w-3 h-3" />
                      </a>
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
