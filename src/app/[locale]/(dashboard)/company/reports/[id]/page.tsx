"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
import { ArrowLeft, Send, Loader2, Download, FileText, Lock, Key, Clock, Trash2, History, Pencil, X, Check } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EncryptionKeyDialog } from "@/components/shared/encryption-key-dialog";

interface ReportDetail {
  id: string;
  report_number: string;
  title: string;
  content: string;
  who_field: string | null;
  what_field: string | null;
  when_field: string | null;
  where_field: string | null;
  why_field: string | null;
  how_field: string | null;
  report_type: { id: string; type_name: string; type_name_en: string } | null;
  status: { id: string; status_name: string; status_name_en: string; color_code: string; is_default: boolean } | null;
  ai_validation_score: number | null;
  attachments: Array<{ id: string; file_name: string; file_size: number; mime_type: string }>;
  created_at: string;
}

interface Comment {
  id: string;
  content: string;
  author_type: string;
  is_internal: boolean;
  created_at: string;
}

interface ReportStatus {
  id: string;
  status_name: string;
  color_code: string;
}

interface AccessLog {
  id: string;
  accessed_at: string;
  ip_hash: string | null;
}

interface EditHistoryEntry {
  id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  edited_by: string;
  edited_at: string;
}

function fieldNameLabel(fieldName: string): string {
  const labels: Record<string, string> = {
    title: "제목",
    content: "내용",
    status_id: "상태",
    attachment_added: "첨부파일 추가",
    attachment_removed: "첨부파일 삭제",
  };
  return labels[fieldName] || fieldName;
}

function getEncryptionHeaders(): Record<string, string> {
  const key = typeof window !== "undefined" ? sessionStorage.getItem("encryptionKey") : null;
  return key ? { "x-encryption-key": key } : {};
}

export default function CompanyReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [statuses, setStatuses] = useState<ReportStatus[]>([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusChanging, setStatusChanging] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [encKeyDialogOpen, setEncKeyDialogOpen] = useState(false);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [editHistory, setEditHistory] = useState<EditHistoryEntry[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Comment edit/delete state
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState("");
  const [savingComment, setSavingComment] = useState(false);

  const fetchReportData = async () => {
    try {
      const headers = getEncryptionHeaders();
      const [reportRes, commentsRes, statusesRes, logsRes, historyRes] = await Promise.all([
        fetch(`/api/reports/${reportId}`, { headers }),
        fetch(`/api/reports/${reportId}/comments`, { headers }),
        fetch("/api/company/report-statuses"),
        fetch(`/api/reports/${reportId}/access-logs`),
        fetch(`/api/reports/${reportId}/edit-history`),
      ]);
      if (reportRes.ok) {
        const data = await reportRes.json();
        setReport(data.report);
        // Check if content is still encrypted (server couldn't decrypt)
        const encrypted = data.report?.title === "[암호화됨]" || data.report?.content === "[암호화됨]";
        setIsEncrypted(encrypted);
        if (data.report?.status?.status_name) {
          setNewStatus(data.report.status.status_name);
        }
      }
      if (commentsRes.ok) {
        const data = await commentsRes.json();
        setComments(data.comments || []);
      }
      if (statusesRes.ok) {
        const data = await statusesRes.json();
        setStatuses(data.statuses || []);
      }
      if (logsRes.ok) {
        const data = await logsRes.json();
        setAccessLogs(data.logs || []);
      }
      if (historyRes.ok) {
        const data = await historyRes.json();
        setEditHistory(data.history || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [reportId]);

  const handleDownload = async (attachmentId: string) => {
    setDownloadingId(attachmentId);
    try {
      const res = await fetch(`/api/reports/${reportId}/attachments/${attachmentId}`);
      if (res.ok) {
        const data = await res.json();
        const fileRes = await fetch(data.url);
        const blob = await fileRes.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = data.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }
    } catch {
      // ignore
    } finally {
      setDownloadingId(null);
    }
  };

  const handleStatusChange = async () => {
    if (!newStatus || newStatus === report?.status?.status_name) return;
    setStatusChanging(true);
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusName: newStatus }),
      });
      if (res.ok) {
        const headers = getEncryptionHeaders();
        const reportRes = await fetch(`/api/reports/${reportId}`, { headers });
        if (reportRes.ok) {
          const data = await reportRes.json();
          setReport(data.report);
        }
      }
    } catch {
      // ignore
    } finally {
      setStatusChanging(false);
    }
  };

  const handleComment = async () => {
    if (!newComment.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/reports/${reportId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newComment,
          authorType: "company_admin",
          isInternal,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments((prev) => [...prev, data.comment]);
        setNewComment("");
        setIsInternal(false);
      }
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editCommentContent.trim()) return;
    setSavingComment(true);
    try {
      const res = await fetch(`/api/reports/${reportId}/comments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, content: editCommentContent }),
      });
      if (res.ok) {
        setComments((prev) =>
          prev.map((c) => c.id === commentId ? { ...c, content: editCommentContent.trim() } : c)
        );
        setEditingCommentId(null);
      }
    } catch {
      toast.error("댓글 수정 중 오류가 발생했습니다");
    } finally {
      setSavingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const res = await fetch(`/api/reports/${reportId}/comments?commentId=${commentId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }
    } catch {
      toast.error("댓글 삭제 중 오류가 발생했습니다");
    }
  };

  const handleKeyVerified = () => {
    // Re-fetch data with the new key
    setLoading(true);
    fetchReportData();
  };

  const handleDeleteReport = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/reports/${reportId}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        toast.success("제보가 삭제되었습니다");
        setDeleteDialogOpen(false);
        router.push("/company/reports");
      } else {
        toast.error(data.error || "삭제에 실패했습니다");
        setDeleteDialogOpen(false);
      }
    } catch {
      toast.error("삭제 중 오류가 발생했습니다");
      setDeleteDialogOpen(false);
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

  if (!report) {
    return <div className="text-center py-20 text-muted-foreground">제보를 찾을 수 없습니다</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/company/reports">
            <ArrowLeft className="w-4 h-4 mr-2" />
            목록으로
          </Link>
        </Button>
      </div>

      {/* Encryption notice */}
      {isEncrypted && (
        <div className="flex items-center justify-between p-4 rounded-lg border border-amber-200 bg-amber-50">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-800">제보 내용이 암호화되어 있습니다</p>
              <p className="text-sm text-amber-600">암호화 키를 입력하면 내용을 확인할 수 있습니다</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setEncKeyDialogOpen(true)}>
            <Key className="w-4 h-4 mr-2" />
            키 입력
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Report Detail */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm text-muted-foreground">{report.report_number}</p>
                  <CardTitle className="text-xl mt-1">{report.title}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    style={report.status?.color_code ? { backgroundColor: report.status.color_code, color: "#fff" } : {}}
                  >
                    {report.status?.status_name || "-"}
                  </Badge>
                  {report.status?.is_default && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      삭제
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap break-words">{report.content}</p>
              </div>

              {/* 5W1H */}
              {(report.who_field || report.what_field || report.when_field || report.where_field) && (
                <>
                  <Separator />
                  <div className="grid gap-3 sm:grid-cols-2 text-sm">
                    {report.who_field && <div><span className="font-medium">누가:</span> {report.who_field}</div>}
                    {report.what_field && <div><span className="font-medium">무엇을:</span> {report.what_field}</div>}
                    {report.when_field && <div><span className="font-medium">언제:</span> {report.when_field}</div>}
                    {report.where_field && <div><span className="font-medium">어디서:</span> {report.where_field}</div>}
                    {report.why_field && <div><span className="font-medium">왜:</span> {report.why_field}</div>}
                    {report.how_field && <div><span className="font-medium">어떻게:</span> {report.how_field}</div>}
                  </div>
                </>
              )}

              {report.ai_validation_score !== null && (
                <>
                  <Separator />
                  <div className="text-sm">
                    <span className="font-medium">AI 검증 점수:</span>{" "}
                    <Badge variant={report.ai_validation_score >= 0.7 ? "default" : "secondary"}>
                      {Math.round(report.ai_validation_score * 100)}%
                    </Badge>
                  </div>
                </>
              )}

              {report.attachments?.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">첨부파일</h4>
                    {report.attachments.map((att) => (
                      <div key={att.id} className="flex items-center justify-between bg-muted rounded px-3 py-2 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="truncate">{att.file_name}</span>
                          <span className="text-muted-foreground shrink-0">
                            ({(att.file_size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(att.id)}
                          disabled={downloadingId === att.id}
                        >
                          {downloadingId === att.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">커뮤니케이션</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">아직 댓글이 없습니다</p>
              ) : (
                <div className="space-y-3">
                  {comments.map((c) => {
                    const isMe = c.author_type !== "reporter";
                    const isEditingThis = editingCommentId === c.id;
                    return (
                      <div
                        key={c.id}
                        className={`group flex ${isMe ? "justify-end" : "justify-start"}`}
                      >
                        {isEditingThis ? (
                          <div className="max-w-[75%] space-y-2">
                            <Textarea
                              value={editCommentContent}
                              onChange={(e) => setEditCommentContent(e.target.value)}
                              rows={3}
                              className="text-sm"
                            />
                            <div className="flex gap-1 justify-end">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => setEditingCommentId(null)}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                className="h-7 w-7"
                                disabled={savingComment}
                                onClick={() => handleEditComment(c.id)}
                              >
                                {savingComment ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-1">
                            {isMe && (
                              <div className="hidden group-hover:flex gap-0.5 mt-2 shrink-0">
                                <button
                                  className="text-muted-foreground hover:text-foreground p-0.5"
                                  onClick={() => {
                                    setEditingCommentId(c.id);
                                    setEditCommentContent(c.content);
                                  }}
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button
                                  className="text-muted-foreground hover:text-destructive p-0.5"
                                  onClick={() => handleDeleteComment(c.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                            <div
                              className={`max-w-[75%] p-3 rounded-2xl text-sm ${
                                isMe
                                  ? c.is_internal
                                    ? "bg-yellow-100 border border-yellow-300 rounded-br-sm"
                                    : "bg-primary text-primary-foreground rounded-br-sm"
                                  : "bg-muted border rounded-bl-sm"
                              }`}
                            >
                              <div className={`flex items-center gap-2 mb-1 ${isMe ? "justify-end" : ""}`}>
                                <span className="font-medium text-xs">
                                  {c.author_type === "reporter" ? "제보자" : "관리자"}
                                </span>
                                {c.is_internal && <Badge variant="outline" className="text-xs">내부 메모</Badge>}
                              </div>
                              <p className="whitespace-pre-wrap break-words">{c.content}</p>
                              <p className={`text-xs mt-1 ${isMe ? (c.is_internal ? "text-yellow-600" : "text-primary-foreground/70") : "text-muted-foreground"} ${isMe ? "text-right" : ""}`}>
                                {new Date(c.created_at).toLocaleString("ko")}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <Separator />

              <div className="space-y-3">
                <Textarea
                  placeholder="댓글을 입력하세요..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="internal"
                      checked={isInternal}
                      onCheckedChange={(v) => setIsInternal(!!v)}
                    />
                    <Label htmlFor="internal" className="text-sm cursor-pointer">
                      내부 메모 (제보자에게 비공개)
                    </Label>
                  </div>
                  <Button onClick={handleComment} disabled={sending || !newComment.trim()} size="sm">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    전송
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">상태 변경</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="상태 선택" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.id} value={s.status_name}>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: s.color_code }}
                        />
                        {s.status_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleStatusChange}
                className="w-full"
                disabled={!newStatus || newStatus === report.status?.status_name || statusChanging}
              >
                {statusChanging && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                상태 변경
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">유형</span>
                <span>{report.report_type?.type_name || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">접수일</span>
                <span>{new Date(report.created_at).toLocaleDateString("ko")}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-4 h-4" />
                제보자 접속 이력
              </CardTitle>
            </CardHeader>
            <CardContent>
              {accessLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">접속 이력이 없습니다</p>
              ) : (
                <div className="space-y-2 text-sm">
                  {accessLogs.map((log) => (
                    <div key={log.id} className="flex justify-between items-center py-1 border-b last:border-0">
                      <span>{new Date(log.accessed_at).toLocaleString("ko")}</span>
                      {log.ip_hash && (
                        <span className="font-mono text-xs text-muted-foreground">{log.ip_hash}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="w-4 h-4" />
                수정 이력
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">수정 이력이 없습니다</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {editHistory.map((entry) => (
                    <div key={entry.id} className="border-b last:border-0 pb-2 last:pb-0">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-xs">
                          {fieldNameLabel(entry.field_name)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(entry.edited_at).toLocaleString("ko")}
                        </span>
                      </div>
                      {(entry.field_name === "title" || entry.field_name === "content") && (
                        <div className="text-xs space-y-1">
                          {entry.old_value && (
                            <div className="bg-red-50 text-red-700 rounded px-2 py-1 line-through break-all">
                              {entry.old_value.length > 100 ? entry.old_value.substring(0, 100) + "..." : entry.old_value}
                            </div>
                          )}
                          {entry.new_value && (
                            <div className="bg-green-50 text-green-700 rounded px-2 py-1 break-all">
                              {entry.new_value.length > 100 ? entry.new_value.substring(0, 100) + "..." : entry.new_value}
                            </div>
                          )}
                        </div>
                      )}
                      {entry.field_name === "attachment_added" && (
                        <p className="text-xs text-green-600">+ {entry.new_value}</p>
                      )}
                      {entry.field_name === "attachment_removed" && (
                        <p className="text-xs text-red-600">- {entry.old_value}</p>
                      )}
                      {entry.field_name === "status_id" && (
                        <p className="text-xs text-muted-foreground">상태 변경</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {entry.edited_by === "reporter" ? "제보자" : "관리자"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Encryption Key Dialog */}
      <EncryptionKeyDialog
        open={encKeyDialogOpen}
        onOpenChange={setEncKeyDialogOpen}
        onKeyVerified={handleKeyVerified}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>제보 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              제보번호 <strong>{report.report_number}</strong>을(를) 삭제하시겠습니까?
              삭제된 제보는 복구할 수 없으며, 첨부파일과 모든 대화 내역이 함께 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteReport}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
