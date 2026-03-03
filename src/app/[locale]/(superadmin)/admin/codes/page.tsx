"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { sanitizeHtml } from "@/lib/utils/sanitize";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2, GripVertical, X, Save } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

interface DefaultReportType {
  id: string;
  type_name: string;
  type_name_en: string | null;
  type_name_ja: string | null;
  type_name_zh: string | null;
  code: string | null;
  description: string | null;
  notes: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

interface DefaultReportStatus {
  id: string;
  status_name: string;
  status_name_en: string | null;
  status_name_ja: string | null;
  status_name_zh: string | null;
  color_code: string;
  display_order: number;
  is_default: boolean;
  is_terminal: boolean;
  is_active: boolean;
  created_at: string;
}

interface DefaultContentBlock {
  id: string;
  content: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export default function AdminCodesPage() {
  const t = useTranslations("admin.codes");
  const tc = useTranslations("common");

  // ── Report Types State ──
  const [reportTypes, setReportTypes] = useState<DefaultReportType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DefaultReportType | null>(null);
  const [form, setForm] = useState({
    type_name: "", type_name_en: "", type_name_ja: "", type_name_zh: "", code: "", description: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  // ── Report Statuses State ──
  const [statuses, setStatuses] = useState<DefaultReportStatus[]>([]);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<DefaultReportStatus | null>(null);
  const [statusForm, setStatusForm] = useState({
    status_name: "", status_name_en: "", status_name_ja: "", status_name_zh: "",
    color_code: "#6b7280", is_default: false, is_terminal: false,
  });
  const [savingStatus, setSavingStatus] = useState(false);

  // ── Content Blocks State ──
  const [contentBlocks, setContentBlocks] = useState<DefaultContentBlock[]>([]);
  const [savingBlocks, setSavingBlocks] = useState(false);
  const [blockDragIndex, setBlockDragIndex] = useState<number | null>(null);
  const [blockDragOverIndex, setBlockDragOverIndex] = useState<number | null>(null);

  // ── Load Report Types ──
  const loadReportTypes = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/default-report-types");
      if (res.ok) {
        const data = await res.json();
        setReportTypes(data.reportTypes || []);
      }
    } catch { /* ignore */ }
  }, []);

  // ── Load Report Statuses ──
  const loadStatuses = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/default-report-statuses");
      if (res.ok) {
        const data = await res.json();
        setStatuses(data.statuses || []);
      }
    } catch { /* ignore */ }
  }, []);

  // ── Load Content Blocks ──
  const loadContentBlocks = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/default-content-blocks");
      if (res.ok) {
        const data = await res.json();
        setContentBlocks(data.blocks || []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    Promise.all([loadReportTypes(), loadStatuses(), loadContentBlocks()]).finally(() => setLoading(false));
  }, [loadReportTypes, loadStatuses, loadContentBlocks]);

  // ── Report Type Dialog ──
  const openDialog = (rt?: DefaultReportType) => {
    if (rt) {
      setEditing(rt);
      setForm({
        type_name: rt.type_name,
        type_name_en: rt.type_name_en || "",
        type_name_ja: rt.type_name_ja || "",
        type_name_zh: rt.type_name_zh || "",
        code: rt.code || "",
        description: rt.description || "",
        notes: rt.notes || "",
      });
    } else {
      setEditing(null);
      setForm({ type_name: "", type_name_en: "", type_name_ja: "", type_name_zh: "", code: "", description: "", notes: "" });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.type_name.trim()) {
      toast.error(t("enterTypeName"));
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const res = await fetch(`/api/admin/default-report-types/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (res.ok) {
          toast.success(t("reportTypeUpdated"));
          setDialogOpen(false);
          loadReportTypes();
        } else {
          toast.error(t("updateError"));
        }
      } else {
        const res = await fetch("/api/admin/default-report-types", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (res.ok) {
          toast.success(t("reportTypeAdded"));
          setDialogOpen(false);
          loadReportTypes();
        } else {
          toast.error(t("addError"));
        }
      }
    } catch {
      toast.error(t("processError"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirmDelete"))) return;
    try {
      const res = await fetch(`/api/admin/default-report-types/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(t("reportTypeDeleted"));
        loadReportTypes();
      } else {
        toast.error(t("deleteError"));
      }
    } catch {
      toast.error(t("deleteError"));
    }
  };

  // ── Status Dialog ──
  const openStatusDialog = (st?: DefaultReportStatus) => {
    if (st) {
      setEditingStatus(st);
      setStatusForm({
        status_name: st.status_name,
        status_name_en: st.status_name_en || "",
        status_name_ja: st.status_name_ja || "",
        status_name_zh: st.status_name_zh || "",
        color_code: st.color_code,
        is_default: st.is_default,
        is_terminal: st.is_terminal,
      });
    } else {
      setEditingStatus(null);
      setStatusForm({
        status_name: "", status_name_en: "", status_name_ja: "", status_name_zh: "",
        color_code: "#6b7280", is_default: false, is_terminal: false,
      });
    }
    setStatusDialogOpen(true);
  };

  const handleSaveStatus = async () => {
    if (!statusForm.status_name.trim()) {
      toast.error(t("enterStatusName"));
      return;
    }
    setSavingStatus(true);
    try {
      if (editingStatus) {
        const res = await fetch(`/api/admin/default-report-statuses/${editingStatus.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(statusForm),
        });
        if (res.ok) {
          toast.success(t("statusUpdated"));
          setStatusDialogOpen(false);
          loadStatuses();
        } else {
          toast.error(t("updateError"));
        }
      } else {
        const res = await fetch("/api/admin/default-report-statuses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(statusForm),
        });
        if (res.ok) {
          toast.success(t("statusAdded"));
          setStatusDialogOpen(false);
          loadStatuses();
        } else {
          toast.error(t("addError"));
        }
      }
    } catch {
      toast.error(t("processError"));
    } finally {
      setSavingStatus(false);
    }
  };

  const handleDeleteStatus = async (id: string) => {
    if (!confirm(t("confirmDelete"))) return;
    try {
      const res = await fetch(`/api/admin/default-report-statuses/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(t("statusDeleted"));
        loadStatuses();
      } else {
        toast.error(t("deleteError"));
      }
    } catch {
      toast.error(t("deleteError"));
    }
  };

  // ── Content Blocks Handlers ──
  const handleAddBlock = async () => {
    try {
      const res = await fetch("/api/admin/default-content-blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "" }),
      });
      if (res.ok) {
        loadContentBlocks();
      } else {
        toast.error(t("blockAddFailed"));
      }
    } catch {
      toast.error(t("blockAddError"));
    }
  };

  const handleDeleteBlock = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/default-content-blocks/${id}`, { method: "DELETE" });
      if (res.ok) {
        setContentBlocks((prev) => prev.filter((b) => b.id !== id));
      } else {
        toast.error(t("blockDeleteFailed"));
      }
    } catch {
      toast.error(t("blockDeleteError"));
    }
  };

  const handleSaveBlocks = async () => {
    setSavingBlocks(true);
    try {
      const sorted = [...contentBlocks].sort((a, b) => a.display_order - b.display_order);
      const results = await Promise.all(
        sorted.map((block, idx) =>
          fetch(`/api/admin/default-content-blocks/${block.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: block.content, display_order: idx }),
          })
        )
      );
      if (results.every((r) => r.ok)) {
        toast.success(t("blocksSaved"));
        loadContentBlocks();
      } else {
        toast.error(t("blockSavePartialError"));
      }
    } catch {
      toast.error(t("blockSaveError"));
    } finally {
      setSavingBlocks(false);
    }
  };

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
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      {/* ── 기본 제보 유형 ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("defaultReportTypes")}</CardTitle>
              <CardDescription>{t("defaultReportTypesDesc")}</CardDescription>
            </div>
            <Button size="sm" onClick={() => openDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              {t("add")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("typeName")}</TableHead>
                <TableHead>{t("english")}</TableHead>
                <TableHead>{t("japanese")}</TableHead>
                <TableHead>{t("chinese")}</TableHead>
                <TableHead>{t("code")}</TableHead>
                <TableHead>{t("descriptionLabel")}</TableHead>
                <TableHead>{t("notes")}</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportTypes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    {t("noReportTypes")}
                  </TableCell>
                </TableRow>
              ) : (
                reportTypes.map((rt) => (
                  <TableRow key={rt.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {rt.type_name}
                        {!rt.is_active && <Badge variant="secondary">{t("inactive")}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{rt.type_name_en || "-"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{rt.type_name_ja || "-"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{rt.type_name_zh || "-"}</TableCell>
                    <TableCell>
                      {rt.code ? (
                        <Badge variant="outline" className="font-mono">{rt.code}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[300px] text-sm text-muted-foreground">
                      {rt.description ? (
                        <div
                          className="prose prose-sm max-w-none line-clamp-2 [&>p]:m-0"
                          dangerouslySetInnerHTML={{ __html: sanitizeHtml(rt.description) }}
                        />
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {rt.notes || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openDialog(rt)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(rt.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── 기본 상태 코드 ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("defaultStatuses")}</CardTitle>
              <CardDescription>{t("defaultStatusesDesc")}</CardDescription>
            </div>
            <Button size="sm" onClick={() => openStatusDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              {t("add")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("statusName")}</TableHead>
                <TableHead>{t("english")}</TableHead>
                <TableHead>{t("japanese")}</TableHead>
                <TableHead>{t("chinese")}</TableHead>
                <TableHead>{t("color")}</TableHead>
                <TableHead>{t("attributes")}</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statuses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {t("noStatuses")}
                  </TableCell>
                </TableRow>
              ) : (
                statuses.map((st) => (
                  <TableRow key={st.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {st.status_name}
                        {!st.is_active && <Badge variant="secondary">{t("inactive")}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{st.status_name_en || "-"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{st.status_name_ja || "-"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{st.status_name_zh || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: st.color_code }} />
                        <span className="text-sm font-mono">{st.color_code}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {st.is_default && <Badge variant="default" className="text-xs">{t("default")}</Badge>}
                        {st.is_terminal && <Badge variant="secondary" className="text-xs">{t("terminal")}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openStatusDialog(st)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteStatus(st.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── 채널 메인 안내 블록 ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("contentBlocks")}</CardTitle>
              <CardDescription>{t("contentBlocksDesc")}</CardDescription>
            </div>
            <Button size="sm" onClick={handleAddBlock}>
              <Plus className="w-4 h-4 mr-2" />
              {t("addBlock")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {contentBlocks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6 border-2 border-dashed rounded-lg">
              {t("noBlocks")}
            </p>
          ) : (
            <div className="space-y-2">
              {[...contentBlocks]
                .sort((a, b) => a.display_order - b.display_order)
                .map((block, idx) => (
                  <div
                    key={block.id}
                    draggable
                    onDragStart={() => setBlockDragIndex(idx)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setBlockDragOverIndex(idx);
                    }}
                    onDragEnd={() => {
                      if (blockDragIndex !== null && blockDragOverIndex !== null && blockDragIndex !== blockDragOverIndex) {
                        const sorted = [...contentBlocks].sort((a, b) => a.display_order - b.display_order);
                        const [moved] = sorted.splice(blockDragIndex, 1);
                        sorted.splice(blockDragOverIndex, 0, moved);
                        const reordered = sorted.map((b, i) => ({ ...b, display_order: i }));
                        setContentBlocks(reordered);
                      }
                      setBlockDragIndex(null);
                      setBlockDragOverIndex(null);
                    }}
                    className={`flex gap-2 items-start p-3 rounded-lg border transition-colors ${
                      blockDragOverIndex === idx ? "border-primary bg-primary/5" : "bg-background"
                    }`}
                  >
                    <div className="cursor-grab active:cursor-grabbing pt-2 text-muted-foreground hover:text-foreground">
                      <GripVertical className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <RichTextEditor
                        content={block.content}
                        onChange={(html) => {
                          setContentBlocks((prev) =>
                            prev.map((b) => (b.id === block.id ? { ...b, content: html } : b))
                          );
                        }}
                        placeholder={t("blockContentPlaceholder")}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteBlock(block.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
            </div>
          )}
          {contentBlocks.length > 0 && (
            <>
              <Separator />
              <Button onClick={handleSaveBlocks} disabled={savingBlocks}>
                {savingBlocks ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {tc("save")}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Report Type Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[90vw] w-[1200px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editing ? t("editReportType") : t("addReportType")}</DialogTitle>
            <DialogDescription>
              {editing ? t("editReportTypeDesc") : t("addReportTypeDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="drt_type_name">{t("typeNameRequired")}</Label>
                <Input
                  id="drt_type_name"
                  value={form.type_name}
                  onChange={(e) => setForm((f) => ({ ...f, type_name: e.target.value }))}
                  placeholder="예: 부정행위"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="drt_type_name_en">{t("typeNameEn")}</Label>
                <Input
                  id="drt_type_name_en"
                  value={form.type_name_en}
                  onChange={(e) => setForm((f) => ({ ...f, type_name_en: e.target.value }))}
                  placeholder="e.g. Fraud"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="drt_type_name_ja">{t("typeNameJa")}</Label>
                <Input
                  id="drt_type_name_ja"
                  value={form.type_name_ja}
                  onChange={(e) => setForm((f) => ({ ...f, type_name_ja: e.target.value }))}
                  placeholder="例: 不正行為"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="drt_type_name_zh">{t("typeNameZh")}</Label>
                <Input
                  id="drt_type_name_zh"
                  value={form.type_name_zh}
                  onChange={(e) => setForm((f) => ({ ...f, type_name_zh: e.target.value }))}
                  placeholder="例: 欺诈行为"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="drt_code">{t("code")}</Label>
              <Input
                id="drt_code"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="예: FRAUD"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">{t("codeHelp")}</p>
            </div>
            <div className="space-y-2">
              <Label>{t("descriptionLabel")}</Label>
              <RichTextEditor
                content={form.description}
                onChange={(html) => setForm((f) => ({ ...f, description: html }))}
                placeholder={t("descriptionPlaceholder")}
                minHeight="240px"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="drt_notes">{t("notesLabel")}</Label>
              <Textarea
                id="drt_notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                placeholder={t("notesPlaceholder")}
              />
            </div>
          </div>
          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? tc("edit") : t("add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Status Dialog ── */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStatus ? t("editStatus") : t("addStatus")}</DialogTitle>
            <DialogDescription>
              {editingStatus ? t("editStatusDesc") : t("addStatusDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ds_status_name">{t("statusNameKo")}</Label>
                <Input
                  id="ds_status_name"
                  value={statusForm.status_name}
                  onChange={(e) => setStatusForm((f) => ({ ...f, status_name: e.target.value }))}
                  placeholder="예: 접수대기"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ds_status_name_en">{t("statusNameEn")}</Label>
                <Input
                  id="ds_status_name_en"
                  value={statusForm.status_name_en}
                  onChange={(e) => setStatusForm((f) => ({ ...f, status_name_en: e.target.value }))}
                  placeholder="e.g. Pending"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ds_status_name_ja">{t("statusNameJa")}</Label>
                <Input
                  id="ds_status_name_ja"
                  value={statusForm.status_name_ja}
                  onChange={(e) => setStatusForm((f) => ({ ...f, status_name_ja: e.target.value }))}
                  placeholder="例: 受付待ち"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ds_status_name_zh">{t("statusNameZh")}</Label>
                <Input
                  id="ds_status_name_zh"
                  value={statusForm.status_name_zh}
                  onChange={(e) => setStatusForm((f) => ({ ...f, status_name_zh: e.target.value }))}
                  placeholder="例: 待受理"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ds_color_code">{t("color")}</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="ds_color_code"
                  value={statusForm.color_code}
                  onChange={(e) => setStatusForm((f) => ({ ...f, color_code: e.target.value }))}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <Input
                  value={statusForm.color_code}
                  onChange={(e) => setStatusForm((f) => ({ ...f, color_code: e.target.value }))}
                  className="font-mono w-28"
                  maxLength={7}
                />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="ds_is_default"
                  checked={statusForm.is_default}
                  onCheckedChange={(v) => setStatusForm((f) => ({ ...f, is_default: v }))}
                />
                <Label htmlFor="ds_is_default">{t("defaultStatus")}</Label>
                <span className="text-xs text-muted-foreground">{t("defaultStatusHelp")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="ds_is_terminal"
                  checked={statusForm.is_terminal}
                  onCheckedChange={(v) => setStatusForm((f) => ({ ...f, is_terminal: v }))}
                />
                <Label htmlFor="ds_is_terminal">{t("terminalStatus")}</Label>
                <span className="text-xs text-muted-foreground">{t("terminalStatusHelp")}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button onClick={handleSaveStatus} disabled={savingStatus}>
              {savingStatus && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingStatus ? tc("edit") : t("add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
