"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  companies?: { company_name: string } | null;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: page.toString(), limit: "20" });
        if (search) params.set("search", search);
        if (roleFilter !== "all") params.set("role", roleFilter);
        const res = await fetch(`/api/admin/users?${params}`);
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users || []);
          setTotal(data.total || 0);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, [page, search, roleFilter]);

  const totalPages = Math.ceil(total / 20);
  const roleLabel = (role: string) => {
    switch (role) {
      case "super_admin": return "슈퍼 관리자";
      case "company_admin": return "기업 관리자";
      default: return role;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">사용자 관리</h1>
        <p className="text-muted-foreground">플랫폼 전체 사용자를 관리합니다</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="사용자 검색..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="역할" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="super_admin">슈퍼 관리자</SelectItem>
            <SelectItem value="company_admin">기업 관리자</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead>아이디</TableHead>
                <TableHead>이메일</TableHead>
                <TableHead>역할</TableHead>
                <TableHead>소속</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>가입일</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">로딩 중...</TableCell></TableRow>
              ) : users.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">사용자가 없습니다</TableCell></TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="font-mono text-sm">{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell><Badge variant="outline">{roleLabel(user.role)}</Badge></TableCell>
                    <TableCell>{user.companies?.company_name || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? "default" : "secondary"}>
                        {user.is_active ? "활성" : "비활성"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString("ko")}
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
