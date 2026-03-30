"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Loader2, Eye } from "lucide-react";

interface AuditLogEntry {
  id: string;
  company_id: string | null;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  changes: { old?: Record<string, unknown>; new?: Record<string, unknown> } | null;
  ip_hash: string | null;
  created_at: string;
}

interface CompanyOption {
  id: string;
  name: string;
}

const ACTION_OPTIONS = [
  "report.create", "report.view", "report.update", "report.delete",
  "report.status_change", "report.export",
  "comment.create", "comment.update", "comment.delete",
  "settings.update",
  "user.login", "user.logout",
  "staff.create", "staff.update", "staff.delete",
];

const ENTITY_OPTIONS = ["report", "comment", "settings", "user", "staff"];

function actionToKey(action: string): string {
  return action.replace(/[._](\w)/g, (_, c) => c.toUpperCase());
}

function getActionBadgeVariant(action: string): "default" | "secondary" | "destructive" | "outline" {
  if (action.endsWith(".create")) return "default";
  if (action.endsWith(".update") || action.endsWith(".status_change")) return "secondary";
  if (action.endsWith(".delete")) return "destructive";
  return "outline";
}

export default function AdminAuditLogsPage() {
  const t = useTranslations("admin.auditLogs");
  const ct = useTranslations("company.auditLogs");

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [detailLog, setDetailLog] = useState<AuditLogEntry | null>(null);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const limit = 20;
  const totalPages = Math.ceil(total / limit);

  useEffect(() => {
    fetch("/api/companies?limit=50")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.companies) {
          setCompanies(data.companies.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
        }
      })
      .catch(() => {});
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
      if (actionFilter !== "all") params.set("action", actionFilter);
      if (entityFilter !== "all") params.set("entityType", entityFilter);
      if (companyFilter !== "all") params.set("companyId", companyFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(`/api/admin/audit-logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, entityFilter, companyFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    setPage(1);
  }, [actionFilter, entityFilter, companyFilter, dateFrom, dateTo]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  const getCompanyName = (companyId: string | null) => {
    if (!companyId) return "-";
    return companies.find((c) => c.id === companyId)?.name || companyId.slice(0, 8);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t("filterByCompany")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allCompanies")}</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={ct("filterByAction")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ct("allActions")}</SelectItem>
                {ACTION_OPTIONS.map((a) => (
                  <SelectItem key={a} value={a}>{ct(`actions.${actionToKey(a)}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={ct("filterByEntity")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ct("allEntities")}</SelectItem>
                {ENTITY_OPTIONS.map((e) => (
                  <SelectItem key={e} value={e}>{ct(`entities.${e}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-[160px]"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[160px]"
            />
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">{ct("noLogs")}</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">{ct("timestamp")}</TableHead>
                    <TableHead className="w-[120px]">{t("filterByCompany")}</TableHead>
                    <TableHead className="w-[120px]">{ct("actor")}</TableHead>
                    <TableHead className="w-[160px]">{ct("action")}</TableHead>
                    <TableHead className="w-[100px]">{ct("entity")}</TableHead>
                    <TableHead>{ct("details")}</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {getCompanyName(log.company_id)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.actor_name || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionBadgeVariant(log.action)}>
                          {ct(`actions.${actionToKey(log.action)}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {ct(`entities.${log.entity_type}`)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {log.entity_id || "-"}
                      </TableCell>
                      <TableCell>
                        {log.changes && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDetailLog(log)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-muted-foreground">
                  {total} | {page} / {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detailLog} onOpenChange={() => setDetailLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{ct("viewChanges")}</DialogTitle>
          </DialogHeader>
          {detailLog?.changes && (
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {detailLog.changes.old && (
                <div>
                  <h4 className="font-semibold text-sm mb-2 text-destructive">Before</h4>
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                    {JSON.stringify(detailLog.changes.old, null, 2)}
                  </pre>
                </div>
              )}
              {detailLog.changes.new && (
                <div>
                  <h4 className="font-semibold text-sm mb-2 text-primary">After</h4>
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                    {JSON.stringify(detailLog.changes.new, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
