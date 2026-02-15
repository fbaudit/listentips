"use client";

import { useEffect, useState, useCallback } from "react";
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
      toast.error("유형명을 입력해주세요");
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
          toast.success("기본 제보 유형이 수정되었습니다");
          setDialogOpen(false);
          loadReportTypes();
        } else {
          toast.error("수정 중 오류가 발생했습니다");
        }
      } else {
        const res = await fetch("/api/admin/default-report-types", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (res.ok) {
          toast.success("기본 제보 유형이 추가되었습니다");
          setDialogOpen(false);
          loadReportTypes();
        } else {
          toast.error("추가 중 오류가 발생했습니다");
        }
      }
    } catch {
      toast.error("처리 중 오류가 발생했습니다");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/admin/default-report-types/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("기본 제보 유형이 삭제되었습니다");
        loadReportTypes();
      } else {
        toast.error("삭제 중 오류가 발생했습니다");
      }
    } catch {
      toast.error("삭제 중 오류가 발생했습니다");
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
      toast.error("상태명을 입력해주세요");
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
          toast.success("기본 상태 코드가 수정되었습니다");
          setStatusDialogOpen(false);
          loadStatuses();
        } else {
          toast.error("수정 중 오류가 발생했습니다");
        }
      } else {
        const res = await fetch("/api/admin/default-report-statuses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(statusForm),
        });
        if (res.ok) {
          toast.success("기본 상태 코드가 추가되었습니다");
          setStatusDialogOpen(false);
          loadStatuses();
        } else {
          toast.error("추가 중 오류가 발생했습니다");
        }
      }
    } catch {
      toast.error("처리 중 오류가 발생했습니다");
    } finally {
      setSavingStatus(false);
    }
  };

  const handleDeleteStatus = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/admin/default-report-statuses/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("기본 상태 코드가 삭제되었습니다");
        loadStatuses();
      } else {
        toast.error("삭제 중 오류가 발생했습니다");
      }
    } catch {
      toast.error("삭제 중 오류가 발생했습니다");
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
        toast.error("블록 추가에 실패했습니다");
      }
    } catch {
      toast.error("블록 추가 중 오류가 발생했습니다");
    }
  };

  const handleDeleteBlock = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/default-content-blocks/${id}`, { method: "DELETE" });
      if (res.ok) {
        setContentBlocks((prev) => prev.filter((b) => b.id !== id));
      } else {
        toast.error("블록 삭제에 실패했습니다");
      }
    } catch {
      toast.error("블록 삭제 중 오류가 발생했습니다");
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
        toast.success("안내 블록이 저장되었습니다");
        loadContentBlocks();
      } else {
        toast.error("일부 블록 저장에 실패했습니다");
      }
    } catch {
      toast.error("저장 중 오류가 발생했습니다");
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
        <h1 className="text-2xl font-bold">코드 관리</h1>
        <p className="text-muted-foreground">제보 유형 및 상태 코드를 관리합니다</p>
      </div>

      {/* ── 기본 제보 유형 ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>기본 제보 유형</CardTitle>
              <CardDescription>신규 기업 등록 시 자동으로 생성되는 기본 제보 유형입니다</CardDescription>
            </div>
            <Button size="sm" onClick={() => openDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              추가
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>유형명</TableHead>
                <TableHead>영어</TableHead>
                <TableHead>일본어</TableHead>
                <TableHead>중국어</TableHead>
                <TableHead>코드</TableHead>
                <TableHead>설명</TableHead>
                <TableHead>비고</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportTypes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    등록된 기본 제보 유형이 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                reportTypes.map((rt) => (
                  <TableRow key={rt.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {rt.type_name}
                        {!rt.is_active && <Badge variant="secondary">비활성</Badge>}
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
              <CardTitle>기본 상태 코드</CardTitle>
              <CardDescription>신규 기업 등록 시 자동으로 생성되는 제보 처리 상태 코드입니다</CardDescription>
            </div>
            <Button size="sm" onClick={() => openStatusDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              추가
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>상태명</TableHead>
                <TableHead>영어</TableHead>
                <TableHead>일본어</TableHead>
                <TableHead>중국어</TableHead>
                <TableHead>색상</TableHead>
                <TableHead>속성</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statuses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    등록된 기본 상태 코드가 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                statuses.map((st) => (
                  <TableRow key={st.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {st.status_name}
                        {!st.is_active && <Badge variant="secondary">비활성</Badge>}
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
                        {st.is_default && <Badge variant="default" className="text-xs">기본</Badge>}
                        {st.is_terminal && <Badge variant="secondary" className="text-xs">종결</Badge>}
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
              <CardTitle>채널 메인 안내 블록</CardTitle>
              <CardDescription>신규 기업 등록 시 자동으로 생성되는 제보 채널 메인 페이지 하단 안내 블록입니다. 드래그하여 순서를 변경할 수 있습니다.</CardDescription>
            </div>
            <Button size="sm" onClick={handleAddBlock}>
              <Plus className="w-4 h-4 mr-2" />
              블록 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {contentBlocks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6 border-2 border-dashed rounded-lg">
              안내 블록이 없습니다. 블록을 추가하세요.
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
                        placeholder="안내 내용을 입력하세요"
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
                저장
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Report Type Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[90vw] w-[1200px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editing ? "기본 제보 유형 수정" : "기본 제보 유형 추가"}</DialogTitle>
            <DialogDescription>
              {editing ? "기본 제보 유형 정보를 수정합니다" : "신규 기업에 자동 생성될 기본 제보 유형을 추가합니다"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="drt_type_name">유형명 *</Label>
                <Input
                  id="drt_type_name"
                  value={form.type_name}
                  onChange={(e) => setForm((f) => ({ ...f, type_name: e.target.value }))}
                  placeholder="예: 부정행위"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="drt_type_name_en">유형명 (영어)</Label>
                <Input
                  id="drt_type_name_en"
                  value={form.type_name_en}
                  onChange={(e) => setForm((f) => ({ ...f, type_name_en: e.target.value }))}
                  placeholder="e.g. Fraud"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="drt_type_name_ja">유형명 (일본어)</Label>
                <Input
                  id="drt_type_name_ja"
                  value={form.type_name_ja}
                  onChange={(e) => setForm((f) => ({ ...f, type_name_ja: e.target.value }))}
                  placeholder="例: 不正行為"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="drt_type_name_zh">유형명 (중국어)</Label>
                <Input
                  id="drt_type_name_zh"
                  value={form.type_name_zh}
                  onChange={(e) => setForm((f) => ({ ...f, type_name_zh: e.target.value }))}
                  placeholder="例: 欺诈行为"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="drt_code">코드</Label>
              <Input
                id="drt_code"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="예: FRAUD"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">시스템 내부에서 사용되는 고유 코드입니다 (영문 대문자 권장)</p>
            </div>
            <div className="space-y-2">
              <Label>설명</Label>
              <RichTextEditor
                content={form.description}
                onChange={(html) => setForm((f) => ({ ...f, description: html }))}
                placeholder="해당 유형에 대한 설명을 입력하세요"
                minHeight="240px"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="drt_notes">비고</Label>
              <Textarea
                id="drt_notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                placeholder="추가 참고사항을 입력하세요"
              />
            </div>
          </div>
          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Status Dialog ── */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStatus ? "기본 상태 코드 수정" : "기본 상태 코드 추가"}</DialogTitle>
            <DialogDescription>
              {editingStatus ? "기본 상태 코드 정보를 수정합니다" : "신규 기업에 자동 생성될 기본 상태 코드를 추가합니다"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ds_status_name">상태명 (한국어) *</Label>
                <Input
                  id="ds_status_name"
                  value={statusForm.status_name}
                  onChange={(e) => setStatusForm((f) => ({ ...f, status_name: e.target.value }))}
                  placeholder="예: 접수대기"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ds_status_name_en">상태명 (영어)</Label>
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
                <Label htmlFor="ds_status_name_ja">상태명 (일본어)</Label>
                <Input
                  id="ds_status_name_ja"
                  value={statusForm.status_name_ja}
                  onChange={(e) => setStatusForm((f) => ({ ...f, status_name_ja: e.target.value }))}
                  placeholder="例: 受付待ち"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ds_status_name_zh">상태명 (중국어)</Label>
                <Input
                  id="ds_status_name_zh"
                  value={statusForm.status_name_zh}
                  onChange={(e) => setStatusForm((f) => ({ ...f, status_name_zh: e.target.value }))}
                  placeholder="例: 待受理"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ds_color_code">색상</Label>
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
                <Label htmlFor="ds_is_default">기본 상태</Label>
                <span className="text-xs text-muted-foreground">(제보 접수 시 초기 상태)</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="ds_is_terminal"
                  checked={statusForm.is_terminal}
                  onCheckedChange={(v) => setStatusForm((f) => ({ ...f, is_terminal: v }))}
                />
                <Label htmlFor="ds_is_terminal">종결 상태</Label>
                <span className="text-xs text-muted-foreground">(처리 완료를 의미)</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveStatus} disabled={savingStatus}>
              {savingStatus && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingStatus ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
