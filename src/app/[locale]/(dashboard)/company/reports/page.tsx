"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Search, ChevronLeft, ChevronRight, Download, Loader2 } from "lucide-react";

interface Report {
  id: string;
  report_number: string;
  title: string;
  status: { name: string; color: string } | null;
  report_type: { name: string } | null;
  created_at: string;
}

const CSV_FIELDS = [
  { key: "report_number", label: "접수번호", default: true },
  { key: "title", label: "제목", default: true },
  { key: "content", label: "제보 내용", default: true },
  { key: "report_type", label: "제보 유형", default: true },
  { key: "status", label: "처리 상태", default: true },
  { key: "ai_validation_score", label: "AI 검증 점수", default: true },
  { key: "view_count", label: "조회수", default: true },
  { key: "reporter_locale", label: "제보 언어", default: true },
  { key: "attachments", label: "첨부파일명", default: true },
  { key: "created_at", label: "접수일시", default: true },
  { key: "updated_at", label: "수정일시", default: true },
] as const;

type CsvFieldKey = (typeof CSV_FIELDS)[number]["key"];

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function CompanyReportsPage() {
  const t = useTranslations("company");
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // CSV export dialog
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportFields, setExportFields] = useState<Set<CsvFieldKey>>(
    new Set(CSV_FIELDS.filter((f) => f.default).map((f) => f.key))
  );
  const [exporting, setExporting] = useState(false);

  // Statuses for filter dropdown
  const [statuses, setStatuses] = useState<{ status_name: string }[]>([]);

  useEffect(() => {
    fetch("/api/company/report-statuses")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data?.statuses) setStatuses(data.statuses); })
      .catch(() => {});
  }, []);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const encKey = sessionStorage.getItem("encryptionKey");
      const headers: Record<string, string> = {};
      if (encKey) headers["x-encryption-key"] = encKey;
      const res = await fetch(`/api/reports?${params}`, { headers });
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
  }, [page, pageSize, search, statusFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Reset selection when data changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, pageSize, search, statusFilter]);

  const totalPages = Math.ceil(total / pageSize);

  // Selection handlers
  const allSelected = reports.length > 0 && reports.every((r) => selectedIds.has(r.id));
  const someSelected = reports.some((r) => selectedIds.has(r.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(reports.map((r) => r.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // CSV field toggle
  const toggleExportField = (key: CsvFieldKey) => {
    const next = new Set(exportFields);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setExportFields(next);
  };

  const toggleAllExportFields = () => {
    if (exportFields.size === CSV_FIELDS.length) {
      setExportFields(new Set());
    } else {
      setExportFields(new Set(CSV_FIELDS.map((f) => f.key)));
    }
  };

  // CSV download
  const handleExport = async () => {
    if (selectedIds.size === 0 || exportFields.size === 0) return;

    setExporting(true);
    try {
      const encKey = sessionStorage.getItem("encryptionKey");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (encKey) headers["x-encryption-key"] = encKey;

      const res = await fetch("/api/company/reports/export", {
        method: "POST",
        headers,
        body: JSON.stringify({ reportIds: Array.from(selectedIds) }),
      });

      if (!res.ok) return;

      const data = await res.json();
      const exportReports = data.reports as Record<string, unknown>[];

      // Build CSV
      const selectedFieldMeta = CSV_FIELDS.filter((f) => exportFields.has(f.key));
      const headerRow = selectedFieldMeta.map((f) => f.label).join(",");

      const rows = exportReports.map((report) =>
        selectedFieldMeta.map((f) => {
          let value = String(report[f.key] ?? "");
          // Format dates
          if ((f.key === "created_at" || f.key === "updated_at") && value) {
            try { value = new Date(value).toLocaleString("ko"); } catch { /* keep raw */ }
          }
          // Escape CSV: wrap in quotes if contains comma, newline, or quote
          if (value.includes(",") || value.includes("\n") || value.includes('"')) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(",")
      );

      const BOM = "\uFEFF";
      const csv = BOM + [headerRow, ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `제보목록_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setShowExportDialog(false);
    } catch {
      // ignore
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("reports.title")}</h1>
        <p className="text-muted-foreground">{t("reports.description")}</p>
      </div>

      {/* Filters & Actions */}
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
            {statuses.map((s) => (
              <SelectItem key={s.status_name} value={s.status_name}>{s.status_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={() => setShowExportDialog(true)}
          disabled={selectedIds.size === 0}
        >
          <Download className="w-4 h-4 mr-2" />
          CSV ({selectedIds.size})
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="전체 선택"
                    {...(someSelected && !allSelected ? { "data-state": "indeterminate" } : {})}
                  />
                </TableHead>
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
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    로딩 중...
                  </TableCell>
                </TableRow>
              ) : reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    제보가 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                reports.map((report) => (
                  <TableRow key={report.id} className={selectedIds.has(report.id) ? "bg-muted/50" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(report.id)}
                        onCheckedChange={() => toggleSelect(report.id)}
                        aria-label={`${report.report_number} 선택`}
                      />
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/company/reports/${report.id}`}
                        className="font-mono text-primary hover:underline"
                      >
                        {report.report_number}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium max-w-[300px] truncate">{report.title}</TableCell>
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
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {new Date(report.created_at).toLocaleDateString("ko")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination + Page Size */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">페이지당</span>
          <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>{size}건</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            총 {total}건
          </span>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-2">
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

      {/* CSV Export Field Selection Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>CSV 내보내기</DialogTitle>
            <DialogDescription>
              선택된 {selectedIds.size}건의 제보를 CSV로 내려받습니다.
              내려받을 필드를 선택하세요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* Select All Fields */}
            <div className="flex items-center gap-2 pb-2 border-b">
              <Checkbox
                id="field-all"
                checked={exportFields.size === CSV_FIELDS.length}
                onCheckedChange={toggleAllExportFields}
              />
              <label htmlFor="field-all" className="text-sm font-medium cursor-pointer">
                전체 선택 / 해제
              </label>
            </div>

            {/* Individual Fields */}
            <div className="grid grid-cols-2 gap-2">
              {CSV_FIELDS.map((field) => (
                <div key={field.key} className="flex items-center gap-2">
                  <Checkbox
                    id={`field-${field.key}`}
                    checked={exportFields.has(field.key)}
                    onCheckedChange={() => toggleExportField(field.key)}
                  />
                  <label htmlFor={`field-${field.key}`} className="text-sm cursor-pointer">
                    {field.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              취소
            </Button>
            <Button onClick={handleExport} disabled={exporting || exportFields.size === 0}>
              {exporting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Download className="w-4 h-4 mr-2" />
              다운로드
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
