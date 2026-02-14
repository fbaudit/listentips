"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Save, ArrowLeft, ExternalLink, Copy, Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/routing";

interface CompanyDetail {
  id: string;
  company_code: string;
  name: string;
  name_en: string | null;
  business_number: string | null;
  representative_name: string | null;
  industry: string | null;
  employee_count: number | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  description: string | null;
  channel_name: string | null;
  welcome_message: string | null;
  report_guide_message: string | null;
  primary_color: string;
  use_ai_validation: boolean;
  use_chatbot: boolean;
  ai_provider: string | null;
  ai_api_key_configured: boolean;
  preferred_locale: string;
  is_active: boolean;
  service_start: string | null;
  service_end: string | null;
  created_at: string;
  updated_at: string;
}

interface StaffMember {
  id: string;
  email: string;
  username: string;
  name: string;
  phone: string | null;
  mobile: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminCompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [aiApiKey, setAiApiKey] = useState("");

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Staff state
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [staffForm, setStaffForm] = useState({
    name: "", email: "", username: "", password: "", phone: "", mobile: "",
  });
  const [staffSaving, setStaffSaving] = useState(false);

  const loadStaff = async () => {
    try {
      const res = await fetch(`/api/admin/companies/${companyId}/staff`);
      if (res.ok) {
        const data = await res.json();
        setStaff(data.staff || []);
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    async function fetchCompany() {
      try {
        const res = await fetch(`/api/admin/companies/${companyId}`);
        if (res.ok) {
          const data = await res.json();
          setCompany(data.company);
        } else {
          toast.error("기업 정보를 불러올 수 없습니다");
        }
      } catch {
        toast.error("기업 정보 로딩 중 오류가 발생했습니다");
      } finally {
        setLoading(false);
      }
    }
    fetchCompany();
    loadStaff();
  }, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!company) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { ...company };
      if (aiApiKey.trim()) {
        payload.ai_api_key = aiApiKey.trim();
      }
      const res = await fetch(`/api/admin/companies/${companyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success("기업 정보가 저장되었습니다");
        if (aiApiKey.trim()) {
          setCompany((c) => c ? { ...c, ai_api_key_configured: true } : c);
          setAiApiKey("");
        }
      } else {
        toast.error("저장 중 오류가 발생했습니다");
      }
    } catch {
      toast.error("저장 중 오류가 발생했습니다");
    } finally {
      setSaving(false);
    }
  };

  // Staff handlers
  const openStaffDialog = (s?: StaffMember) => {
    if (s) {
      setEditingStaff(s);
      setStaffForm({
        name: s.name, email: s.email, username: s.username,
        password: "", phone: s.phone || "", mobile: s.mobile || "",
      });
    } else {
      setEditingStaff(null);
      setStaffForm({ name: "", email: "", username: "", password: "", phone: "", mobile: "" });
    }
    setStaffDialogOpen(true);
  };

  const handleSaveStaff = async () => {
    if (!staffForm.name.trim() || !staffForm.email.trim()) {
      toast.error("이름과 이메일은 필수입니다");
      return;
    }
    if (!editingStaff && (!staffForm.username.trim() || !staffForm.password.trim())) {
      toast.error("아이디와 비밀번호는 필수입니다");
      return;
    }
    setStaffSaving(true);
    try {
      if (editingStaff) {
        const body: Record<string, string> = {
          name: staffForm.name, email: staffForm.email,
          phone: staffForm.phone, mobile: staffForm.mobile,
        };
        if (staffForm.password) body.password = staffForm.password;
        const res = await fetch(`/api/admin/companies/${companyId}/staff/${editingStaff.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          toast.success("담당자 정보가 수정되었습니다");
          setStaffDialogOpen(false);
          loadStaff();
        } else {
          const data = await res.json();
          toast.error(data.error || "수정 중 오류가 발생했습니다");
        }
      } else {
        const res = await fetch(`/api/admin/companies/${companyId}/staff`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(staffForm),
        });
        if (res.ok) {
          toast.success("담당자가 추가되었습니다");
          setStaffDialogOpen(false);
          loadStaff();
        } else {
          const data = await res.json();
          toast.error(data.error || "추가 중 오류가 발생했습니다");
        }
      }
    } catch {
      toast.error("처리 중 오류가 발생했습니다");
    } finally {
      setStaffSaving(false);
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/admin/companies/${companyId}/staff/${staffId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("담당자가 삭제되었습니다");
        loadStaff();
      } else {
        toast.error("삭제 중 오류가 발생했습니다");
      }
    } catch {
      toast.error("삭제 중 오류가 발생했습니다");
    }
  };

  const handleDeleteCompany = async () => {
    if (!company || deleteConfirmName !== company.name) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/companies/${companyId}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        toast.success("기업 데이터가 모두 삭제되었습니다");
        router.push("/admin/companies");
      } else {
        toast.error(data.error || "삭제 중 오류가 발생했습니다");
      }
    } catch {
      toast.error("삭제 중 오류가 발생했습니다");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="space-y-6">
        <div className="text-center py-20">
          <p className="text-muted-foreground">기업을 찾을 수 없습니다</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/admin/companies">
              <ArrowLeft className="w-4 h-4 mr-2" />
              목록으로 돌아가기
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/admin/companies">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{company.name}</h1>
            <p className="text-muted-foreground">기업 상세 정보 관리</p>
          </div>
        </div>
        <Badge variant={company.is_active ? "default" : "secondary"} className="text-sm">
          {company.is_active ? "활성" : "비활성"}
        </Badge>
      </div>

      {/* Report Channel URL */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <Label className="shrink-0">제보 채널 URL</Label>
            <Input
              readOnly
              value={`${typeof window !== "undefined" ? window.location.origin : ""}/report/${company.company_code}`}
              className="bg-white font-mono text-sm"
            />
            <Button
              variant="outline"
              size="icon"
              title="URL 복사"
              onClick={() => {
                navigator.clipboard.writeText(
                  `${window.location.origin}/report/${company.company_code}`
                );
                toast.success("URL이 복사되었습니다");
              }}
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              title="새 탭에서 열기"
              onClick={() => window.open(`/report/${company.company_code}`, "_blank")}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Company Info */}
      <Card>
        <CardHeader>
          <CardTitle>기업 기본 정보</CardTitle>
          <CardDescription>기업 기본 정보를 확인하고 수정합니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>회사코드</Label>
              <Input value={company.company_code} disabled className="bg-muted font-mono" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">회사명</Label>
              <Input
                id="name"
                value={company.name || ""}
                onChange={(e) => setCompany((c) => c ? { ...c, name: e.target.value } : c)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name_en">회사명 (영문)</Label>
              <Input
                id="name_en"
                value={company.name_en || ""}
                onChange={(e) => setCompany((c) => c ? { ...c, name_en: e.target.value } : c)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="business_number">사업자번호</Label>
              <Input
                id="business_number"
                value={company.business_number || ""}
                onChange={(e) => setCompany((c) => c ? { ...c, business_number: e.target.value } : c)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="representative_name">대표자명</Label>
              <Input
                id="representative_name"
                value={company.representative_name || ""}
                onChange={(e) => setCompany((c) => c ? { ...c, representative_name: e.target.value } : c)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">업종</Label>
              <Input
                id="industry"
                value={company.industry || ""}
                onChange={(e) => setCompany((c) => c ? { ...c, industry: e.target.value } : c)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee_count">직원수</Label>
              <Input
                id="employee_count"
                type="number"
                value={company.employee_count || ""}
                onChange={(e) => setCompany((c) => c ? { ...c, employee_count: e.target.value ? parseInt(e.target.value) : null } : c)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">전화번호</Label>
              <Input
                id="phone"
                value={company.phone || ""}
                onChange={(e) => setCompany((c) => c ? { ...c, phone: e.target.value } : c)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                value={company.email || ""}
                onChange={(e) => setCompany((c) => c ? { ...c, email: e.target.value } : c)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">웹사이트</Label>
              <Input
                id="website"
                value={company.website || ""}
                onChange={(e) => setCompany((c) => c ? { ...c, website: e.target.value } : c)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">주소</Label>
              <Input
                id="address"
                value={company.address || ""}
                onChange={(e) => setCompany((c) => c ? { ...c, address: e.target.value } : c)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">회사 소개</Label>
              <Textarea
                id="description"
                value={company.description || ""}
                onChange={(e) => setCompany((c) => c ? { ...c, description: e.target.value } : c)}
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Management */}
      <Card>
        <CardHeader>
          <CardTitle>서비스 관리</CardTitle>
          <CardDescription>서비스 상태 및 기간을 관리합니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>서비스 활성화</Label>
              <p className="text-sm text-muted-foreground">비활성화하면 제보 채널 접근이 차단됩니다</p>
            </div>
            <Switch
              checked={company.is_active}
              onCheckedChange={(v) => setCompany((c) => c ? { ...c, is_active: v } : c)}
            />
          </div>
          <Separator />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="service_start">서비스 시작일</Label>
              <Input
                id="service_start"
                type="date"
                value={company.service_start ? company.service_start.split("T")[0] : ""}
                onChange={(e) => setCompany((c) => c ? { ...c, service_start: e.target.value || null } : c)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="service_end">서비스 만료일</Label>
              <Input
                id="service_end"
                type="date"
                value={company.service_end ? company.service_end.split("T")[0] : ""}
                onChange={(e) => setCompany((c) => c ? { ...c, service_end: e.target.value || null } : c)}
              />
            </div>
            <div className="space-y-2">
              <Label>기본 언어</Label>
              <Select
                value={company.preferred_locale}
                onValueChange={(v) => setCompany((c) => c ? { ...c, preferred_locale: v } : c)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ko">한국어</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ja">日本語</SelectItem>
                  <SelectItem value="zh">中文</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            등록일: {new Date(company.created_at).toLocaleDateString("ko")} · 최종 수정: {new Date(company.updated_at).toLocaleDateString("ko")}
          </div>
        </CardContent>
      </Card>

      {/* Channel Settings */}
      <Card>
        <CardHeader>
          <CardTitle>채널 설정</CardTitle>
          <CardDescription>제보 채널의 기능을 설정합니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="channel_name">채널 이름</Label>
            <Input
              id="channel_name"
              value={company.channel_name || ""}
              onChange={(e) => setCompany((c) => c ? { ...c, channel_name: e.target.value } : c)}
              placeholder="익명 제보 채널"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="welcome_message">안내 메시지</Label>
            <Textarea
              id="welcome_message"
              value={company.welcome_message || ""}
              onChange={(e) => setCompany((c) => c ? { ...c, welcome_message: e.target.value } : c)}
              rows={3}
              placeholder="제보자에게 보여줄 안내 메시지"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="report_guide_message">제보내용 안내문구</Label>
            <Textarea
              id="report_guide_message"
              value={company.report_guide_message || ""}
              onChange={(e) => setCompany((c) => c ? { ...c, report_guide_message: e.target.value } : c)}
              rows={3}
              placeholder="제보 내용을 상세히 작성해주세요"
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label>AI 콘텐츠 검증</Label>
              <p className="text-sm text-muted-foreground">제보 접수 시 AI가 6하원칙 기반으로 내용을 검증합니다</p>
            </div>
            <Switch
              checked={company.use_ai_validation}
              onCheckedChange={(v) => setCompany((c) => c ? { ...c, use_ai_validation: v } : c)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>AI 챗봇</Label>
              <p className="text-sm text-muted-foreground">제보자가 회사 정책에 대해 질문할 수 있는 챗봇을 제공합니다</p>
            </div>
            <Switch
              checked={company.use_chatbot}
              onCheckedChange={(v) => setCompany((c) => c ? { ...c, use_chatbot: v } : c)}
            />
          </div>

          {(company.use_ai_validation || company.use_chatbot) && (
            <div className="ml-4 pl-4 border-l-2 border-muted space-y-4">
              <div className="space-y-2">
                <Label>AI 제공자</Label>
                <Select
                  value={company.ai_provider || ""}
                  onValueChange={(v) => setCompany((c) => c ? { ...c, ai_provider: v || null } : c)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="시스템 기본값 (Gemini)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini">Google Gemini</SelectItem>
                    <SelectItem value="openai">OpenAI (GPT)</SelectItem>
                    <SelectItem value="claude">Anthropic Claude</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">설정하지 않으면 시스템 기본 설정(Gemini)을 사용합니다</p>
              </div>
              {company.ai_provider && (
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="password"
                      value={aiApiKey}
                      onChange={(e) => setAiApiKey(e.target.value)}
                      placeholder={
                        company.ai_provider === "gemini" ? "AIza..."
                          : company.ai_provider === "openai" ? "sk-..."
                          : "sk-ant-..."
                      }
                    />
                    {company.ai_api_key_configured && !aiApiKey && (
                      <Badge variant="secondary">설정됨</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {company.ai_api_key_configured
                      ? "새 키를 입력하면 기존 키가 교체됩니다. 비워두면 기존 키가 유지됩니다."
                      : "선택한 AI 제공자의 API 키를 입력하세요."}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Staff Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>담당자 정보</CardTitle>
              <CardDescription>제보를 관리하는 담당자를 관리합니다</CardDescription>
            </div>
            <Button size="sm" onClick={() => openStaffDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              담당자 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {staff.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              등록된 담당자가 없습니다
            </p>
          ) : (
            <div className="space-y-3">
              {staff.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{s.name}</span>
                      <Badge variant="outline">{s.role === "company_admin" ? "관리자" : s.role}</Badge>
                      {!s.is_active && <Badge variant="secondary">비활성</Badge>}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{s.email}</span>
                      {s.phone && <span>{s.phone}</span>}
                      {s.mobile && <span>{s.mobile}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      아이디: {s.username} · 등록일: {new Date(s.created_at).toLocaleDateString("ko")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openStaffDialog(s)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteStaff(s.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          저장
        </Button>
      </div>

      {/* Danger Zone - only show for inactive companies */}
      {!company.is_active && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              위험 구역
            </CardTitle>
            <CardDescription>
              이 작업은 되돌릴 수 없습니다. 신중하게 진행해주세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">기업 데이터 전체 삭제</p>
                <p className="text-sm text-muted-foreground">
                  기업 정보, 제보 내용, 첨부파일, 담당자 계정 등 모든 데이터가 영구 삭제됩니다.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => {
                  setDeleteConfirmName("");
                  setDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                전체 삭제
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Staff Dialog */}
      <Dialog open={staffDialogOpen} onOpenChange={setStaffDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStaff ? "담당자 정보 수정" : "담당자 추가"}</DialogTitle>
            <DialogDescription>
              {editingStaff ? "담당자 정보를 수정합니다" : "새로운 담당자를 추가합니다"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="staff_name">이름 *</Label>
                <Input
                  id="staff_name"
                  value={staffForm.name}
                  onChange={(e) => setStaffForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff_email">이메일 *</Label>
                <Input
                  id="staff_email"
                  type="email"
                  value={staffForm.email}
                  onChange={(e) => setStaffForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff_username">아이디 {!editingStaff && "*"}</Label>
                <Input
                  id="staff_username"
                  value={staffForm.username}
                  onChange={(e) => setStaffForm((f) => ({ ...f, username: e.target.value }))}
                  readOnly={!!editingStaff}
                  disabled={!!editingStaff}
                  className={editingStaff ? "bg-muted" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff_password">
                  {editingStaff ? "새 비밀번호" : "비밀번호 *"}
                </Label>
                <Input
                  id="staff_password"
                  type="password"
                  value={staffForm.password}
                  onChange={(e) => setStaffForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder={editingStaff ? "변경 시에만 입력" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff_phone">전화번호</Label>
                <Input
                  id="staff_phone"
                  value={staffForm.phone}
                  onChange={(e) => setStaffForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff_mobile">휴대전화</Label>
                <Input
                  id="staff_mobile"
                  value={staffForm.mobile}
                  onChange={(e) => setStaffForm((f) => ({ ...f, mobile: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStaffDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveStaff} disabled={staffSaving}>
              {staffSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingStaff ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              기업 데이터 전체 삭제
            </DialogTitle>
            <DialogDescription>
              이 작업은 되돌릴 수 없습니다. 삭제를 확인하려면 아래에 기업명을 정확히 입력해주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive space-y-1">
              <p className="font-medium">다음 데이터가 모두 삭제됩니다:</p>
              <ul className="list-disc list-inside text-xs space-y-0.5">
                <li>기업 정보 및 설정</li>
                <li>모든 제보 내용 및 첨부파일</li>
                <li>모든 댓글 및 첨부파일</li>
                <li>담당자 계정</li>
                <li>구독 정보</li>
              </ul>
            </div>
            <div className="space-y-2">
              <Label htmlFor="delete_confirm">
                확인을 위해 <span className="font-bold">{company.name}</span>을(를) 입력하세요
              </Label>
              <Input
                id="delete_confirm"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder={company.name}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteCompany}
              disabled={deleting || deleteConfirmName !== company.name}
            >
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              영구 삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
