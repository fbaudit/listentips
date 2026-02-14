"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  phone: string | null;
  mobile: string | null;
  country: string | null;
  role: string;
  company_id: string | null;
  is_active: boolean;
  two_factor_enabled: boolean;
  valid_from: string | null;
  valid_to: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  companies?: { name: string; company_code: string } | null;
}

interface Company {
  id: string;
  name: string;
  company_code: string;
}

const emptyForm = {
  name: "",
  email: "",
  username: "",
  password: "",
  phone: "",
  mobile: "",
  country: "KR",
  role: "company_admin" as string,
  company_id: "" as string,
  is_active: true,
  valid_from: "",
  valid_to: "",
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("ko", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("ko", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
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
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  const fetchCompanies = useCallback(async () => {
    try {
      const res = await fetch("/api/companies?limit=500");
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.companies || []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  const totalPages = Math.ceil(total / 20);

  const roleLabel = (role: string) => {
    switch (role) {
      case "super_admin": return "슈퍼 관리자";
      case "admin": return "일반 관리자";
      case "other_admin": return "기타 관리자";
      case "company_admin": return "기업 관리자";
      default: return role;
    }
  };

  // ── Open Dialog ──
  const openDialog = (user?: User) => {
    if (user) {
      setEditing(user);
      setForm({
        name: user.name,
        email: user.email,
        username: user.username,
        password: "",
        phone: user.phone || "",
        mobile: user.mobile || "",
        country: user.country || "KR",
        role: user.role,
        company_id: user.company_id || "",
        is_active: user.is_active,
        valid_from: user.valid_from ? user.valid_from.slice(0, 10) : "",
        valid_to: user.valid_to ? user.valid_to.slice(0, 10) : "",
      });
    } else {
      setEditing(null);
      setForm({ ...emptyForm });
    }
    setDialogOpen(true);
  };

  // ── Save (Create / Update) ──
  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.username.trim()) {
      toast.error("이름, 이메일, 아이디는 필수입니다");
      return;
    }
    if (!editing && !form.password) {
      toast.error("비밀번호를 입력해주세요");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        // Update
        const payload: Record<string, unknown> = {
          name: form.name,
          email: form.email,
          username: form.username,
          phone: form.phone || null,
          mobile: form.mobile || null,
          country: form.country || "KR",
          role: form.role,
          company_id: form.company_id || null,
          is_active: form.is_active,
          valid_from: form.valid_from || null,
          valid_to: form.valid_to || null,
        };
        if (form.password) payload.password = form.password;

        const res = await fetch(`/api/admin/users/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          toast.success("사용자가 수정되었습니다");
          setDialogOpen(false);
          fetchUsers();
        } else {
          const data = await res.json();
          toast.error(data.error || "수정 중 오류가 발생했습니다");
        }
      } else {
        // Create
        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            username: form.username,
            password: form.password,
            phone: form.phone || null,
            mobile: form.mobile || null,
            country: form.country || "KR",
            role: form.role,
            companyId: form.company_id || null,
          }),
        });
        if (res.ok) {
          toast.success("사용자가 추가되었습니다");
          setDialogOpen(false);
          fetchUsers();
        } else {
          const data = await res.json();
          toast.error(data.error || "추가 중 오류가 발생했습니다");
        }
      }
    } catch {
      toast.error("처리 중 오류가 발생했습니다");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("사용자가 삭제되었습니다");
        setDeleteTarget(null);
        fetchUsers();
      } else {
        const data = await res.json();
        toast.error(data.error || "삭제 중 오류가 발생했습니다");
      }
    } catch {
      toast.error("삭제 중 오류가 발생했습니다");
    }
  };

  // ── Toggle Active ──
  const toggleActive = async (user: User) => {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !user.is_active }),
      });
      if (res.ok) {
        toast.success(user.is_active ? "비활성화되었습니다" : "활성화되었습니다");
        fetchUsers();
      }
    } catch {
      toast.error("상태 변경 중 오류가 발생했습니다");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">사용자 관리</h1>
          <p className="text-muted-foreground">플랫폼 전체 사용자를 관리합니다 (총 {total}명)</p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          사용자 추가
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="이름, 이메일, 아이디로 검색..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="역할" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="super_admin">슈퍼 관리자</SelectItem>
            <SelectItem value="admin">일반 관리자</SelectItem>
            <SelectItem value="other_admin">기타 관리자</SelectItem>
            <SelectItem value="company_admin">기업 관리자</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">이름</TableHead>
                  <TableHead className="whitespace-nowrap">아이디</TableHead>
                  <TableHead className="whitespace-nowrap">이메일</TableHead>
                  <TableHead className="whitespace-nowrap">역할</TableHead>
                  <TableHead className="whitespace-nowrap">소속</TableHead>
                  <TableHead className="whitespace-nowrap">전화</TableHead>
                  <TableHead className="whitespace-nowrap">휴대전화</TableHead>
                  <TableHead className="whitespace-nowrap">국가</TableHead>
                  <TableHead className="whitespace-nowrap">상태</TableHead>
                  <TableHead className="whitespace-nowrap">2FA</TableHead>
                  <TableHead className="whitespace-nowrap">유효 시작</TableHead>
                  <TableHead className="whitespace-nowrap">유효 종료</TableHead>
                  <TableHead className="whitespace-nowrap">최근 로그인</TableHead>
                  <TableHead className="whitespace-nowrap">생성일</TableHead>
                  <TableHead className="whitespace-nowrap">수정일</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={16} className="text-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin inline-block mr-2" />로딩 중...
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={16} className="text-center py-8 text-muted-foreground">
                      사용자가 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium whitespace-nowrap">{user.name}</TableCell>
                      <TableCell className="font-mono text-sm whitespace-nowrap">{user.username}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{user.email}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant={user.role === "super_admin" ? "default" : user.role === "company_admin" ? "outline" : "secondary"}>
                          {roleLabel(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {user.companies?.name || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {user.phone || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {user.mobile || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {user.country || "-"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge
                          variant={user.is_active ? "default" : "secondary"}
                          className="cursor-pointer"
                          onClick={() => toggleActive(user)}
                        >
                          {user.is_active ? "활성" : "비활성"}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {user.two_factor_enabled ? (
                          <ShieldCheck className="w-4 h-4 text-green-600" />
                        ) : (
                          <ShieldOff className="w-4 h-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(user.valid_from)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(user.valid_to)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDateTime(user.last_login_at)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(user.created_at)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(user.updated_at)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openDialog(user)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(user)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* ── User Create/Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "사용자 수정" : "사용자 추가"}</DialogTitle>
            <DialogDescription>
              {editing ? "사용자 정보를 수정합니다" : "새 사용자를 추가합니다"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* 기본 정보 */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="u_username">아이디 (이메일) *</Label>
                <Input
                  id="u_username"
                  type="email"
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  placeholder="user@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="u_name">이름 *</Label>
                <Input
                  id="u_name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="홍길동"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="u_email">이메일 (비밀번호 찾기, 2차 인증) *</Label>
                <div className="flex items-center gap-1.5">
                  <Checkbox
                    id="u_email_same"
                    checked={form.email === form.username && form.username !== ""}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setForm((f) => ({ ...f, email: f.username }));
                      }
                    }}
                  />
                  <Label htmlFor="u_email_same" className="text-xs text-muted-foreground cursor-pointer">
                    로그인 ID(이메일)와 동일
                  </Label>
                </div>
              </div>
              <Input
                id="u_email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u_password">
                비밀번호 {editing ? "(변경 시에만 입력)" : "*"}
              </Label>
              <Input
                id="u_password"
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder={editing ? "변경하지 않으면 비워두세요" : "비밀번호 입력"}
              />
            </div>

            {/* 연락처 정보 */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="u_phone">전화번호</Label>
                <Input
                  id="u_phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="02-1234-5678"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="u_mobile">휴대전화</Label>
                <Input
                  id="u_mobile"
                  value={form.mobile}
                  onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
                  placeholder="010-1234-5678"
                />
              </div>
            </div>

            {/* 역할/국가 */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>역할 *</Label>
                <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">슈퍼 관리자</SelectItem>
                    <SelectItem value="admin">일반 관리자</SelectItem>
                    <SelectItem value="other_admin">기타 관리자</SelectItem>
                    <SelectItem value="company_admin">기업 관리자</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="u_country">국가</Label>
                <Select value={form.country} onValueChange={(v) => setForm((f) => ({ ...f, country: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KR">한국 (KR)</SelectItem>
                    <SelectItem value="US">미국 (US)</SelectItem>
                    <SelectItem value="JP">일본 (JP)</SelectItem>
                    <SelectItem value="CN">중국 (CN)</SelectItem>
                    <SelectItem value="SG">싱가포르 (SG)</SelectItem>
                    <SelectItem value="HK">홍콩 (HK)</SelectItem>
                    <SelectItem value="TW">대만 (TW)</SelectItem>
                    <SelectItem value="GB">영국 (GB)</SelectItem>
                    <SelectItem value="DE">독일 (DE)</SelectItem>
                    <SelectItem value="FR">프랑스 (FR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 소속 기업 */}
            <div className="space-y-2">
              <Label>소속 기업</Label>
              <Select
                value={form.company_id || "none"}
                onValueChange={(v) => setForm((f) => ({ ...f, company_id: v === "none" ? "" : v }))}
              >
                <SelectTrigger><SelectValue placeholder="선택 없음" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">없음</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.company_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 유효 기간 */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="u_valid_from">유효 시작일</Label>
                <Input
                  id="u_valid_from"
                  type="date"
                  value={form.valid_from}
                  onChange={(e) => setForm((f) => ({ ...f, valid_from: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="u_valid_to">유효 종료일</Label>
                <Input
                  id="u_valid_to"
                  type="date"
                  value={form.valid_to}
                  onChange={(e) => setForm((f) => ({ ...f, valid_to: e.target.value }))}
                />
              </div>
            </div>

            {editing && (
              <div className="flex items-center gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <Switch
                    id="u_active"
                    checked={form.is_active}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                  />
                  <Label htmlFor="u_active">활성 상태</Label>
                </div>
                <div className="text-sm text-muted-foreground">
                  2FA: {editing.two_factor_enabled ? "활성화" : "비활성화"}
                </div>
                {editing.last_login_at && (
                  <div className="text-sm text-muted-foreground">
                    최근 로그인: {formatDateTime(editing.last_login_at)}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>사용자 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong> ({deleteTarget?.email}) 사용자를 삭제하시겠습니까?
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
