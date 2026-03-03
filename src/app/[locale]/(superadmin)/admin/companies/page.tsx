"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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
import { Search, ChevronLeft, ChevronRight, ExternalLink, Copy, Check } from "lucide-react";
import { Link } from "@/i18n/routing";

interface Company {
  id: string;
  name: string;
  company_code: string;
  industry: string | null;
  is_active: boolean;
  service_end: string | null;
  subscription_status: string | null;
  subscription_end_date: string | null;
  created_at: string;
}

function getStatusInfo(company: Company): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  const serviceExpired = company.service_end ? new Date(company.service_end) < new Date() : false;
  if (serviceExpired && company.is_active) {
    return { label: "expired", variant: "destructive" };
  }
  if (company.is_active && company.subscription_status === "cancelled") {
    return { label: "pendingCancel", variant: "outline" };
  }
  if (company.is_active) {
    return { label: "active", variant: "default" };
  }
  if (!company.is_active && (company.subscription_status === "cancelled" || company.subscription_status === "expired")) {
    return { label: "cancelled", variant: "destructive" };
  }
  return { label: "inactive", variant: "secondary" };
}

export default function AdminCompaniesPage() {
  const t = useTranslations("admin.companies");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function copyAdminUrl(companyId: string) {
    const url = `${window.location.origin}/company/login`;
    navigator.clipboard.writeText(url);
    setCopiedId(companyId);
    setTimeout(() => setCopiedId(null), 2000);
  }

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

  // Client-side status filter
  const filteredCompanies = statusFilter === "all"
    ? companies
    : companies.filter((c) => {
        const status = getStatusInfo(c);
        return status.label === statusFilter;
      });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t("searchPlaceholder")} className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t("statusFilter")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all")}</SelectItem>
            <SelectItem value="active">{t("active")}</SelectItem>
            <SelectItem value="pendingCancel">{t("pendingCancel")}</SelectItem>
            <SelectItem value="expired">{t("expired")}</SelectItem>
            <SelectItem value="cancelled">{t("cancelled")}</SelectItem>
            <SelectItem value="inactive">{t("inactive")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("companyName")}</TableHead>
                <TableHead>{t("code")}</TableHead>
                <TableHead>{t("industry")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("serviceExpiry")}</TableHead>
                <TableHead>{t("reportUrlLabel")}</TableHead>
                <TableHead>{t("adminUrl")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">{t("loading")}</TableCell></TableRow>
              ) : filteredCompanies.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">{t("noCompanies")}</TableCell></TableRow>
              ) : (
                filteredCompanies.map((c) => {
                  const statusInfo = getStatusInfo(c);
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/admin/companies/${c.id}`}
                          className="text-primary hover:underline cursor-pointer"
                        >
                          {c.name}
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono">{c.company_code}</TableCell>
                      <TableCell>{c.industry || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant}>
                          {t(statusInfo.label)}
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
                        <button
                          onClick={() => copyAdminUrl(c.id)}
                          className="text-muted-foreground hover:text-primary inline-flex items-center gap-1 text-sm"
                        >
                          /company/login
                          {copiedId === c.id ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })
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
