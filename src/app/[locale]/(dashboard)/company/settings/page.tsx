"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Save, Plus, Pencil, Trash2, Bell, UserPlus, Copy, ExternalLink, Link2, GripVertical, X } from "lucide-react";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

// ─── Types ────────────────────────────────────────────────────────────

interface CompanySettings {
  name: string;
  name_en: string;
  logo_url: string | null;
  company_code: string;
  business_number: string;
  representative_name: string;
  industry: string;
  employee_count: number | null;
  address: string;
  phone: string;
  email: string;
  website: string;
  description: string;
  channel_name: string;
  welcome_message: string;
  report_guide_message: string;
  primary_color: string;
  use_ai_validation: boolean;
  use_chatbot: boolean;
  preferred_locale: string;
  content_blocks: Array<{ id: string; content: string; order: number }>;
}

interface ReportType {
  id: string;
  type_name: string;
  type_name_en: string;
  description: string;
  display_order: number;
  is_active: boolean;
}

interface ReportStatus {
  id: string;
  status_name: string;
  status_name_en: string;
  color_code: string;
  display_order: number;
  is_default: boolean;
  is_terminal: boolean;
}

interface StaffMember {
  id: string;
  email: string;
  username: string;
  name: string;
  phone: string;
  mobile: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface NotificationPref {
  event_type: string;
  email_enabled: boolean;
  sms_enabled: boolean;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  new_report: "제보 접수",
  report_modified: "제보 수정",
  report_deleted: "제보 삭제",
  new_comment: "새 댓글 작성",
  comment_modified: "댓글 수정",
  comment_deleted: "댓글 삭제",
};

const EVENT_TYPE_DESCRIPTIONS: Record<string, string> = {
  new_report: "제보자가 새로운 제보를 접수했을 때",
  report_modified: "제보자가 제보 내용을 수정했을 때 (내용 변경이 없으면 알림 없음)",
  report_deleted: "제보자가 제보를 삭제했을 때",
  new_comment: "제보자가 새로운 댓글을 작성했을 때",
  comment_modified: "제보자가 댓글을 수정했을 때 (내용 변경이 없으면 알림 없음)",
  comment_deleted: "제보자가 댓글을 삭제했을 때",
};

// ─── Main Component ───────────────────────────────────────────────────

export default function CompanySettingsPage() {
  const t = useTranslations("company");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<CompanySettings | null>(null);

  // Report types state
  const [reportTypes, setReportTypes] = useState<ReportType[]>([]);
  const [rtDialogOpen, setRtDialogOpen] = useState(false);
  const [editingRt, setEditingRt] = useState<ReportType | null>(null);
  const [rtForm, setRtForm] = useState({ type_name: "", type_name_en: "", description: "" });
  const [rtSaving, setRtSaving] = useState(false);

  // Report statuses state
  const [reportStatuses, setReportStatuses] = useState<ReportStatus[]>([]);
  const [rsDialogOpen, setRsDialogOpen] = useState(false);
  const [editingRs, setEditingRs] = useState<ReportStatus | null>(null);
  const [rsForm, setRsForm] = useState({ status_name: "", status_name_en: "", color_code: "#6b7280", is_default: false, is_terminal: false });
  const [rsSaving, setRsSaving] = useState(false);

  // Staff state
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [staffForm, setStaffForm] = useState({
    name: "", email: "", username: "", password: "", phone: "", mobile: "",
  });
  const [staffSaving, setStaffSaving] = useState(false);

  // Logo state
  const [logoUploading, setLogoUploading] = useState(false);

  // Content blocks drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Notification prefs state
  const [notifDialogOpen, setNotifDialogOpen] = useState(false);
  const [notifStaff, setNotifStaff] = useState<StaffMember | null>(null);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPref[]>([]);
  const [notifSaving, setNotifSaving] = useState(false);

  // ─── Data Loading ─────────────────────────────────────────────────

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/company/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data.company);
      }
    } catch { /* ignore */ }
  }, []);

  const loadReportTypes = useCallback(async () => {
    try {
      const res = await fetch("/api/company/report-types");
      if (res.ok) {
        const data = await res.json();
        setReportTypes(data.reportTypes || []);
      }
    } catch { /* ignore */ }
  }, []);

  const loadReportStatuses = useCallback(async () => {
    try {
      const res = await fetch("/api/company/report-statuses");
      if (res.ok) {
        const data = await res.json();
        setReportStatuses(data.statuses || []);
      }
    } catch { /* ignore */ }
  }, []);

  const loadStaff = useCallback(async () => {
    try {
      const res = await fetch("/api/company/staff");
      if (res.ok) {
        const data = await res.json();
        setStaff(data.staff || []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    Promise.all([loadSettings(), loadReportTypes(), loadReportStatuses(), loadStaff()]).finally(() =>
      setLoading(false)
    );
  }, [loadSettings, loadReportTypes, loadReportStatuses, loadStaff]);

  // ─── Company Settings Handlers ────────────────────────────────────

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/company/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        toast.success("설정이 저장되었습니다");
      } else {
        toast.error("저장 중 오류가 발생했습니다");
      }
    } catch {
      toast.error("저장 중 오류가 발생했습니다");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const res = await fetch("/api/company/logo", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok && data.logoUrl) {
        setSettings((s) => s ? { ...s, logo_url: data.logoUrl } : s);
        toast.success("로고가 업로드되었습니다");
      } else {
        toast.error(data.error || "로고 업로드 실패");
      }
    } catch {
      toast.error("로고 업로드 중 오류가 발생했습니다");
    } finally {
      setLogoUploading(false);
      e.target.value = "";
    }
  };

  const handleLogoDelete = async () => {
    setLogoUploading(true);
    try {
      const res = await fetch("/api/company/logo", { method: "DELETE" });
      if (res.ok) {
        setSettings((s) => s ? { ...s, logo_url: null } : s);
        toast.success("로고가 삭제되었습니다");
      }
    } catch {
      toast.error("로고 삭제 중 오류가 발생했습니다");
    } finally {
      setLogoUploading(false);
    }
  };

  // ─── Report Type Handlers ─────────────────────────────────────────

  const openRtDialog = (rt?: ReportType) => {
    if (rt) {
      setEditingRt(rt);
      setRtForm({ type_name: rt.type_name, type_name_en: rt.type_name_en || "", description: rt.description || "" });
    } else {
      setEditingRt(null);
      setRtForm({ type_name: "", type_name_en: "", description: "" });
    }
    setRtDialogOpen(true);
  };

  const handleSaveRt = async () => {
    if (!rtForm.type_name.trim()) {
      toast.error("제보 유형명을 입력해주세요");
      return;
    }
    setRtSaving(true);
    try {
      if (editingRt) {
        const res = await fetch(`/api/company/report-types/${editingRt.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rtForm),
        });
        if (res.ok) {
          toast.success("제보 유형이 수정되었습니다");
          setRtDialogOpen(false);
          loadReportTypes();
        } else {
          toast.error("수정 중 오류가 발생했습니다");
        }
      } else {
        const res = await fetch("/api/company/report-types", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rtForm),
        });
        if (res.ok) {
          toast.success("제보 유형이 추가되었습니다");
          setRtDialogOpen(false);
          loadReportTypes();
        } else {
          toast.error("추가 중 오류가 발생했습니다");
        }
      }
    } catch {
      toast.error("처리 중 오류가 발생했습니다");
    } finally {
      setRtSaving(false);
    }
  };

  const handleDeleteRt = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/company/report-types/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("제보 유형이 삭제되었습니다");
        loadReportTypes();
      } else {
        toast.error("삭제 중 오류가 발생했습니다");
      }
    } catch {
      toast.error("삭제 중 오류가 발생했습니다");
    }
  };

  // ─── Report Status Handlers ──────────────────────────────────────

  const openRsDialog = (rs?: ReportStatus) => {
    if (rs) {
      setEditingRs(rs);
      setRsForm({
        status_name: rs.status_name,
        status_name_en: rs.status_name_en || "",
        color_code: rs.color_code || "#6b7280",
        is_default: rs.is_default,
        is_terminal: rs.is_terminal,
      });
    } else {
      setEditingRs(null);
      setRsForm({ status_name: "", status_name_en: "", color_code: "#6b7280", is_default: false, is_terminal: false });
    }
    setRsDialogOpen(true);
  };

  const handleSaveRs = async () => {
    if (!rsForm.status_name.trim()) {
      toast.error("상태명을 입력해주세요");
      return;
    }
    setRsSaving(true);
    try {
      if (editingRs) {
        const res = await fetch(`/api/company/report-statuses/${editingRs.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rsForm),
        });
        if (res.ok) {
          toast.success("상태가 수정되었습니다");
          setRsDialogOpen(false);
          loadReportStatuses();
        } else {
          toast.error("수정 중 오류가 발생했습니다");
        }
      } else {
        const res = await fetch("/api/company/report-statuses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rsForm),
        });
        if (res.ok) {
          toast.success("상태가 추가되었습니다");
          setRsDialogOpen(false);
          loadReportStatuses();
        } else {
          toast.error("추가 중 오류가 발생했습니다");
        }
      }
    } catch {
      toast.error("처리 중 오류가 발생했습니다");
    } finally {
      setRsSaving(false);
    }
  };

  const handleDeleteRs = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/company/report-statuses/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("상태가 삭제되었습니다");
        loadReportStatuses();
      } else {
        toast.error("삭제 중 오류가 발생했습니다");
      }
    } catch {
      toast.error("삭제 중 오류가 발생했습니다");
    }
  };

  // ─── Staff Handlers ───────────────────────────────────────────────

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
          name: staffForm.name,
          email: staffForm.email,
          phone: staffForm.phone,
          mobile: staffForm.mobile,
        };
        if (staffForm.password) body.password = staffForm.password;
        const res = await fetch(`/api/company/staff/${editingStaff.id}`, {
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
        const res = await fetch("/api/company/staff", {
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

  const handleDeleteStaff = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까? 해당 담당자의 알림 설정도 함께 삭제됩니다.")) return;
    try {
      const res = await fetch(`/api/company/staff/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("담당자가 삭제되었습니다");
        loadStaff();
      } else {
        const data = await res.json();
        toast.error(data.error || "삭제 중 오류가 발생했습니다");
      }
    } catch {
      toast.error("삭제 중 오류가 발생했습니다");
    }
  };

  // ─── Notification Handlers ────────────────────────────────────────

  const openNotifDialog = async (s: StaffMember) => {
    setNotifStaff(s);
    setNotifDialogOpen(true);
    try {
      const res = await fetch(`/api/company/staff/${s.id}/notifications`);
      if (res.ok) {
        const data = await res.json();
        setNotifPrefs(data.preferences || []);
      }
    } catch { /* ignore */ }
  };

  const toggleNotifPref = (eventType: string, field: "email_enabled" | "sms_enabled") => {
    setNotifPrefs((prev) =>
      prev.map((p) =>
        p.event_type === eventType ? { ...p, [field]: !p[field] } : p
      )
    );
  };

  const handleSaveNotif = async () => {
    if (!notifStaff) return;
    setNotifSaving(true);
    try {
      const res = await fetch(`/api/company/staff/${notifStaff.id}/notifications`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: notifPrefs }),
      });
      if (res.ok) {
        toast.success("알림 설정이 저장되었습니다");
        setNotifDialogOpen(false);
      } else {
        toast.error("저장 중 오류가 발생했습니다");
      }
    } catch {
      toast.error("저장 중 오류가 발생했습니다");
    } finally {
      setNotifSaving(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────

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
        <h1 className="text-2xl font-bold">{t("settings.title")}</h1>
        <p className="text-muted-foreground">{t("settings.description")}</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">회사정보</TabsTrigger>
          <TabsTrigger value="channel">채널설정</TabsTrigger>
          <TabsTrigger value="staff">담당자정보</TabsTrigger>
        </TabsList>

        {/* ═══════ Tab 1: 회사정보 ═══════ */}
        <TabsContent value="general" className="mt-6 space-y-6">
          {/* Report Channel URL */}
          {settings?.company_code && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">제보 채널</CardTitle>
                </div>
                <CardDescription>제보자가 익명 제보를 접수할 수 있는 페이지입니다. 아래 URL을 공유하세요.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={`${typeof window !== "undefined" ? window.location.origin : ""}/report/${settings.company_code}`}
                    className="bg-white font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    title="URL 복사"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/report/${settings.company_code}`
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
                    onClick={() => {
                      window.open(`/report/${settings.company_code}`, "_blank");
                    }}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  회사코드: <span className="font-mono font-medium">{settings.company_code}</span>
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>기업 정보</CardTitle>
              <CardDescription>기업 기본 정보를 확인하고 수정합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings && (
                <>
                  {/* Logo Upload */}
                  <div className="space-y-2">
                    <Label>회사 로고</Label>
                    <div className="flex items-center gap-4">
                      <div className="w-[200px] h-[80px] border rounded-lg flex items-center justify-center bg-muted/50 overflow-hidden">
                        {settings.logo_url ? (
                          <img
                            src={settings.logo_url}
                            alt="회사 로고"
                            className="max-w-[200px] max-h-[80px] object-contain"
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">200 x 80</span>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="cursor-pointer">
                          <Input
                            type="file"
                            accept="image/png,image/jpeg,image/svg+xml,image/webp"
                            className="hidden"
                            onChange={handleLogoUpload}
                            disabled={logoUploading}
                          />
                          <span className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 cursor-pointer">
                            {logoUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            로고 업로드
                          </span>
                        </label>
                        {settings.logo_url && (
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={handleLogoDelete} disabled={logoUploading}>
                            <Trash2 className="w-4 h-4 mr-1" /> 삭제
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">권장 사이즈: 200x80px / PNG, JPG, SVG, WebP / 최대 2MB</p>
                  </div>
                  <Separator />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>회사코드</Label>
                      <Input value={settings.company_code || ""} disabled className="bg-muted" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">회사명</Label>
                      <Input
                        id="name"
                        value={settings.name || ""}
                        onChange={(e) => setSettings((s) => s ? { ...s, name: e.target.value } : s)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name_en">회사명 (영문)</Label>
                      <Input
                        id="name_en"
                        value={settings.name_en || ""}
                        onChange={(e) => setSettings((s) => s ? { ...s, name_en: e.target.value } : s)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="business_number">사업자번호</Label>
                      <Input
                        id="business_number"
                        value={settings.business_number || ""}
                        onChange={(e) => setSettings((s) => s ? { ...s, business_number: e.target.value } : s)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="representative_name">대표자명</Label>
                      <Input
                        id="representative_name"
                        value={settings.representative_name || ""}
                        onChange={(e) => setSettings((s) => s ? { ...s, representative_name: e.target.value } : s)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="industry">업종</Label>
                      <Input
                        id="industry"
                        value={settings.industry || ""}
                        onChange={(e) => setSettings((s) => s ? { ...s, industry: e.target.value } : s)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="employee_count">직원수</Label>
                      <Input
                        id="employee_count"
                        type="number"
                        value={settings.employee_count || ""}
                        onChange={(e) => setSettings((s) => s ? { ...s, employee_count: e.target.value ? parseInt(e.target.value) : null } : s)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">전화번호</Label>
                      <Input
                        id="phone"
                        value={settings.phone || ""}
                        onChange={(e) => setSettings((s) => s ? { ...s, phone: e.target.value } : s)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">이메일</Label>
                      <Input
                        id="email"
                        type="email"
                        value={settings.email || ""}
                        onChange={(e) => setSettings((s) => s ? { ...s, email: e.target.value } : s)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">웹사이트</Label>
                      <Input
                        id="website"
                        value={settings.website || ""}
                        onChange={(e) => setSettings((s) => s ? { ...s, website: e.target.value } : s)}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="address">주소</Label>
                      <Input
                        id="address"
                        value={settings.address || ""}
                        onChange={(e) => setSettings((s) => s ? { ...s, address: e.target.value } : s)}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="description">회사 소개</Label>
                      <Textarea
                        id="description"
                        value={settings.description || ""}
                        onChange={(e) => setSettings((s) => s ? { ...s, description: e.target.value } : s)}
                        rows={3}
                      />
                    </div>
                  </div>
                  <Button onClick={handleSaveSettings} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    저장
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════ Tab 2: 채널설정 ═══════ */}
        <TabsContent value="channel" className="mt-6 space-y-6">
          {/* Channel general settings */}
          {settings && (
            <Card>
              <CardHeader>
                <CardTitle>채널 기본 설정</CardTitle>
                <CardDescription>제보 채널의 기능을 설정합니다</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="channelName">제보 채널 이름</Label>
                  <Input
                    id="channelName"
                    value={settings.channel_name || ""}
                    onChange={(e) => setSettings((s) => s ? { ...s, channel_name: e.target.value } : s)}
                    placeholder="익명 제보 채널"
                  />
                  <p className="text-xs text-muted-foreground">제보자에게 보여지는 채널 이름입니다. 비워두면 &apos;익명 제보 채널&apos;이 표시됩니다.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="welcomeMessage">환영 메시지</Label>
                  <Textarea
                    id="welcomeMessage"
                    value={settings.welcome_message || ""}
                    onChange={(e) => setSettings((s) => s ? { ...s, welcome_message: e.target.value } : s)}
                    rows={4}
                    placeholder="제보자에게 보여줄 환영 메시지를 입력하세요"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reportGuideMessage">제보내용 안내문구</Label>
                  <Textarea
                    id="reportGuideMessage"
                    value={settings.report_guide_message || ""}
                    onChange={(e) => setSettings((s) => s ? { ...s, report_guide_message: e.target.value } : s)}
                    rows={4}
                    placeholder="제보 내용을 상세히 작성해주세요. 누가, 무엇을, 언제, 어디서, 왜, 어떻게 했는지 포함해주세요."
                  />
                  <p className="text-xs text-muted-foreground">제보 접수 화면의 제보 내용 입력란에 회색 안내문구로 표시됩니다</p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>AI 콘텐츠 검증</Label>
                    <p className="text-sm text-muted-foreground">제보 접수 시 AI가 6하원칙 기반으로 내용을 검증합니다</p>
                  </div>
                  <Switch
                    checked={settings.use_ai_validation}
                    onCheckedChange={(v) => setSettings((s) => s ? { ...s, use_ai_validation: v } : s)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>AI 챗봇</Label>
                    <p className="text-sm text-muted-foreground">제보자가 회사 정책에 대해 질문할 수 있는 챗봇을 제공합니다</p>
                  </div>
                  <Switch
                    checked={settings.use_chatbot}
                    onCheckedChange={(v) => setSettings((s) => s ? { ...s, use_chatbot: v } : s)}
                  />
                </div>

                <Separator />

                {/* Content Blocks */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>채널 메인 안내 블록</Label>
                      <p className="text-xs text-muted-foreground">제보 채널 메인 페이지 하단에 표시되는 안내 블록입니다. 드래그하여 순서를 변경할 수 있습니다.</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const blocks = [...(settings.content_blocks || [])];
                        blocks.push({
                          id: crypto.randomUUID(),
                          content: "",
                          order: blocks.length,
                        });
                        setSettings((s) => s ? { ...s, content_blocks: blocks } : s);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      블록 추가
                    </Button>
                  </div>

                  {(settings.content_blocks || []).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6 border-2 border-dashed rounded-lg">
                      안내 블록이 없습니다. 블록을 추가하세요.
                    </p>
                  )}

                  <div className="space-y-2">
                    {[...(settings.content_blocks || [])]
                      .sort((a, b) => a.order - b.order)
                      .map((block, idx) => (
                        <div
                          key={block.id}
                          draggable
                          onDragStart={() => setDragIndex(idx)}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragOverIndex(idx);
                          }}
                          onDragEnd={() => {
                            if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
                              const blocks = [...(settings.content_blocks || [])].sort((a, b) => a.order - b.order);
                              const [moved] = blocks.splice(dragIndex, 1);
                              blocks.splice(dragOverIndex, 0, moved);
                              const reordered = blocks.map((b, i) => ({ ...b, order: i }));
                              setSettings((s) => s ? { ...s, content_blocks: reordered } : s);
                            }
                            setDragIndex(null);
                            setDragOverIndex(null);
                          }}
                          className={`flex gap-2 items-start p-3 rounded-lg border transition-colors ${
                            dragOverIndex === idx ? "border-primary bg-primary/5" : "bg-background"
                          }`}
                        >
                          <div className="cursor-grab active:cursor-grabbing pt-2 text-muted-foreground hover:text-foreground">
                            <GripVertical className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <RichTextEditor
                              content={block.content}
                              onChange={(html) => {
                                const blocks = [...(settings.content_blocks || [])];
                                const target = blocks.find((b) => b.id === block.id);
                                if (target) target.content = html;
                                setSettings((s) => s ? { ...s, content_blocks: blocks } : s);
                              }}
                              placeholder="안내 내용을 입력하세요"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0 text-destructive hover:text-destructive"
                            onClick={() => {
                              const blocks = (settings.content_blocks || [])
                                .filter((b) => b.id !== block.id)
                                .sort((a, b) => a.order - b.order)
                                .map((b, i) => ({ ...b, order: i }));
                              setSettings((s) => s ? { ...s, content_blocks: blocks } : s);
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                  </div>
                </div>

                <Button onClick={handleSaveSettings} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  저장
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Report Types CRUD */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>제보 유형 관리</CardTitle>
                  <CardDescription>제보자가 선택할 수 있는 제보 유형을 관리합니다</CardDescription>
                </div>
                <Button size="sm" onClick={() => openRtDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  추가
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {reportTypes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  등록된 제보 유형이 없습니다
                </p>
              ) : (
                <div className="space-y-3">
                  {reportTypes.map((rt) => (
                    <div
                      key={rt.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{rt.type_name}</span>
                          {rt.type_name_en && (
                            <span className="text-sm text-muted-foreground">({rt.type_name_en})</span>
                          )}
                          {!rt.is_active && (
                            <Badge variant="secondary">비활성</Badge>
                          )}
                        </div>
                        {rt.description && (
                          <p className="text-sm text-muted-foreground">{rt.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openRtDialog(rt)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteRt(rt.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Report Statuses CRUD */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>제보 상태 관리</CardTitle>
                  <CardDescription>제보의 처리 상태를 관리합니다</CardDescription>
                </div>
                <Button size="sm" onClick={() => openRsDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  추가
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {reportStatuses.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  등록된 상태가 없습니다
                </p>
              ) : (
                <div className="space-y-3">
                  {reportStatuses.map((rs) => (
                    <div
                      key={rs.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: rs.color_code }}
                        />
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{rs.status_name}</span>
                            {rs.status_name_en && (
                              <span className="text-sm text-muted-foreground">({rs.status_name_en})</span>
                            )}
                            {rs.is_default && <Badge variant="outline" className="text-xs">기본값</Badge>}
                            {rs.is_terminal && <Badge variant="secondary" className="text-xs">종결</Badge>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openRsDialog(rs)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteRs(rs.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════ Tab 3: 담당자정보 ═══════ */}
        <TabsContent value="staff" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>담당자 관리</CardTitle>
                  <CardDescription>제보를 관리하는 담당자를 추가하고 알림 설정을 관리합니다</CardDescription>
                </div>
                <Button size="sm" onClick={() => openStaffDialog()}>
                  <UserPlus className="w-4 h-4 mr-2" />
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
                        <Button
                          variant="ghost"
                          size="icon"
                          title="알림 설정"
                          onClick={() => openNotifDialog(s)}
                        >
                          <Bell className="w-4 h-4" />
                        </Button>
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
        </TabsContent>
      </Tabs>

      {/* ═══════ Report Type Dialog ═══════ */}
      <Dialog open={rtDialogOpen} onOpenChange={setRtDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRt ? "제보 유형 수정" : "제보 유형 추가"}</DialogTitle>
            <DialogDescription>
              {editingRt ? "제보 유형 정보를 수정합니다" : "새로운 제보 유형을 추가합니다"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rt_type_name">유형명 (한국어) *</Label>
              <Input
                id="rt_type_name"
                value={rtForm.type_name}
                onChange={(e) => setRtForm((f) => ({ ...f, type_name: e.target.value }))}
                placeholder="예: 비리/부정행위"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rt_type_name_en">유형명 (영문)</Label>
              <Input
                id="rt_type_name_en"
                value={rtForm.type_name_en}
                onChange={(e) => setRtForm((f) => ({ ...f, type_name_en: e.target.value }))}
                placeholder="e.g. Corruption"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rt_description">설명</Label>
              <Textarea
                id="rt_description"
                value={rtForm.description}
                onChange={(e) => setRtForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                placeholder="해당 유형에 대한 설명을 입력하세요"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRtDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveRt} disabled={rtSaving}>
              {rtSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingRt ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════ Report Status Dialog ═══════ */}
      <Dialog open={rsDialogOpen} onOpenChange={setRsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRs ? "제보 상태 수정" : "제보 상태 추가"}</DialogTitle>
            <DialogDescription>
              {editingRs ? "제보 상태 정보를 수정합니다" : "새로운 제보 상태를 추가합니다"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="rs_status_name">상태명 (한국어) *</Label>
                <Input
                  id="rs_status_name"
                  value={rsForm.status_name}
                  onChange={(e) => setRsForm((f) => ({ ...f, status_name: e.target.value }))}
                  placeholder="예: 검토중"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rs_status_name_en">상태명 (영문)</Label>
                <Input
                  id="rs_status_name_en"
                  value={rsForm.status_name_en}
                  onChange={(e) => setRsForm((f) => ({ ...f, status_name_en: e.target.value }))}
                  placeholder="e.g. Under Review"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rs_color_code">색상</Label>
              <div className="flex items-center gap-3">
                <input
                  id="rs_color_code"
                  type="color"
                  value={rsForm.color_code}
                  onChange={(e) => setRsForm((f) => ({ ...f, color_code: e.target.value }))}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <Input
                  value={rsForm.color_code}
                  onChange={(e) => setRsForm((f) => ({ ...f, color_code: e.target.value }))}
                  className="w-28"
                  placeholder="#6b7280"
                />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="rs_is_default"
                  checked={rsForm.is_default}
                  onCheckedChange={(v) => setRsForm((f) => ({ ...f, is_default: !!v }))}
                />
                <Label htmlFor="rs_is_default" className="text-sm cursor-pointer">
                  기본 상태 (제보 접수 시 자동 적용)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="rs_is_terminal"
                  checked={rsForm.is_terminal}
                  onCheckedChange={(v) => setRsForm((f) => ({ ...f, is_terminal: !!v }))}
                />
                <Label htmlFor="rs_is_terminal" className="text-sm cursor-pointer">
                  종결 상태
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRsDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveRs} disabled={rsSaving}>
              {rsSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingRs ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════ Staff Dialog ═══════ */}
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
              {!editingStaff ? (
                <div className="space-y-2">
                  <Label htmlFor="staff_password">비밀번호 *</Label>
                  <Input
                    id="staff_password"
                    type="password"
                    value={staffForm.password}
                    onChange={(e) => setStaffForm((f) => ({ ...f, password: e.target.value }))}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="staff_password">새 비밀번호</Label>
                  <Input
                    id="staff_password"
                    type="password"
                    value={staffForm.password}
                    onChange={(e) => setStaffForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="변경 시에만 입력"
                  />
                </div>
              )}
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
                  placeholder="SMS 알림 수신용"
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

      {/* ═══════ Notification Settings Dialog ═══════ */}
      <Dialog open={notifDialogOpen} onOpenChange={setNotifDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>알림 설정 - {notifStaff?.name}</DialogTitle>
            <DialogDescription>
              각 이벤트별로 이메일/문자 알림을 설정합니다
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            {/* Header */}
            <div className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground">
              <div className="flex-1">이벤트</div>
              <div className="w-16 text-center">이메일</div>
              <div className="w-16 text-center">문자</div>
            </div>
            <Separator />
            {notifPrefs.map((pref) => (
              <div key={pref.event_type} className="flex items-start gap-3 px-3 py-3">
                <div className="flex-1 space-y-0.5">
                  <div className="text-sm font-medium">{EVENT_TYPE_LABELS[pref.event_type]}</div>
                  <div className="text-xs text-muted-foreground">
                    {EVENT_TYPE_DESCRIPTIONS[pref.event_type]}
                  </div>
                </div>
                <div className="w-16 flex justify-center pt-0.5">
                  <Checkbox
                    checked={pref.email_enabled}
                    onCheckedChange={() => toggleNotifPref(pref.event_type, "email_enabled")}
                  />
                </div>
                <div className="w-16 flex justify-center pt-0.5">
                  <Checkbox
                    checked={pref.sms_enabled}
                    onCheckedChange={() => toggleNotifPref(pref.event_type, "sms_enabled")}
                  />
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveNotif} disabled={notifSaving}>
              {notifSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
