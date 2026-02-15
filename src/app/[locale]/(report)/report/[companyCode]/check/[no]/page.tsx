"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE, MAX_TOTAL_SIZE } from "@/lib/validators/report";
import {
  Download,
  Send,
  Loader2,
  User,
  Building2,
  Pencil,
  Trash2,
  X,
  Check,
  FileText,
  AlertTriangle,
  Upload,
  Paperclip,
} from "lucide-react";

interface ReportDetail {
  id: string;
  report_number: string;
  title: string;
  content: string;
  created_at: string;
  status: { status_name: string; color_code: string; is_default: boolean };
  report_type: { type_name: string };
  attachments: { id: string; file_name: string; file_path: string; file_size: number; mime_type: string }[];
}

interface Comment {
  id: string;
  content: string;
  author_type: string;
  is_internal: boolean;
  created_at: string;
  attachments: { id: string; file_name: string }[];
}

export default function ReportDetailPage() {
  const t = useTranslations("report.detail");
  const params = useParams();
  const router = useRouter();
  const reportNumber = params.no as string;
  const companyCode = params.companyCode as string;
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [report, setReport] = useState<ReportDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [commenting, setCommenting] = useState(false);
  const [error, setError] = useState("");

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [deletedAttachmentIds, setDeletedAttachmentIds] = useState<string[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // Delete state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteErrorDialog, setShowDeleteErrorDialog] = useState(false);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Download state
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Comment edit/delete state
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState("");
  const [savingComment, setSavingComment] = useState(false);

  // Comment attachment state
  const [commentFiles, setCommentFiles] = useState<File[]>([]);
  const commentFileRef = useRef<HTMLInputElement>(null);
  const [downloadingCommentAttId, setDownloadingCommentAttId] = useState<string | null>(null);
  const [commentError, setCommentError] = useState("");

  function getToken() {
    return sessionStorage.getItem(`report_token_${reportNumber}`);
  }

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setError("인증 정보가 없습니다. 다시 로그인해주세요.");
      setLoading(false);
      return;
    }

    Promise.all([
      fetch(`/api/reports/${reportNumber}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
      fetch(`/api/reports/${reportNumber}/comments`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
    ])
      .then(([reportData, commentsData]) => {
        setReport(reportData.report);
        setComments(commentsData.comments || []);
      })
      .catch(() => setError("데이터를 불러올 수 없습니다"))
      .finally(() => setLoading(false));
  }, [reportNumber]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  // Edit handlers
  function startEdit() {
    if (!report) return;
    setEditTitle(report.title);
    setEditContent(report.content);
    setNewFiles([]);
    setDeletedAttachmentIds([]);
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
    setEditTitle("");
    setEditContent("");
    setNewFiles([]);
    setDeletedAttachmentIds([]);
  }

  function handleEditFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const addedFiles = Array.from(e.target.files || []);
    const validFiles = addedFiles.filter((f) => {
      if (!ALLOWED_FILE_TYPES.includes(f.type)) return false;
      if (f.size > MAX_FILE_SIZE) return false;
      return true;
    });

    const existingSize = (report?.attachments || [])
      .filter((a) => !deletedAttachmentIds.includes(a.id))
      .reduce((s, a) => s + a.file_size, 0);
    const currentNewSize = newFiles.reduce((s, f) => s + f.size, 0);
    const addingSize = validFiles.reduce((s, f) => s + f.size, 0);

    if (existingSize + currentNewSize + addingSize > MAX_TOTAL_SIZE) {
      setError("총 파일 크기는 50MB를 초과할 수 없습니다");
      return;
    }

    setNewFiles([...newFiles, ...validFiles]);
    e.target.value = "";
  }

  function removeNewFile(index: number) {
    setNewFiles(newFiles.filter((_, i) => i !== index));
  }

  function markAttachmentForDelete(attachmentId: string) {
    setDeletedAttachmentIds([...deletedAttachmentIds, attachmentId]);
  }

  function unmarkAttachmentForDelete(attachmentId: string) {
    setDeletedAttachmentIds(deletedAttachmentIds.filter((id) => id !== attachmentId));
  }

  async function saveEdit() {
    if (!editTitle.trim() || editTitle.length < 5) {
      setError("제목은 최소 5자 이상이어야 합니다");
      return;
    }
    if (!editContent.trim() || editContent.length < 20) {
      setError("내용은 최소 20자 이상이어야 합니다");
      return;
    }

    setSaving(true);
    setError("");
    const token = getToken();

    try {
      // 1. Update title/content
      const res = await fetch(`/api/reports/${reportNumber}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: editTitle,
          content: editContent,
          editedBy: "reporter",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "수정에 실패했습니다");
        return;
      }

      // 2. Delete marked attachments
      for (const attId of deletedAttachmentIds) {
        await fetch(`/api/reports/${reportNumber}/attachments/${attId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      // 3. Upload new files
      let uploadedAttachments: ReportDetail["attachments"] = [];
      if (newFiles.length > 0) {
        setUploadingFiles(true);
        const formData = new FormData();
        newFiles.forEach((file) => formData.append("files", file));

        const uploadRes = await fetch(`/api/reports/${reportNumber}/attachments`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          uploadedAttachments = uploadData.attachments || [];
        }
        setUploadingFiles(false);
      }

      // 4. Update local state
      setReport((prev) => {
        if (!prev) return prev;
        const remainingAttachments = prev.attachments.filter(
          (a) => !deletedAttachmentIds.includes(a.id)
        );
        return {
          ...prev,
          title: editTitle,
          content: editContent,
          attachments: [...remainingAttachments, ...uploadedAttachments],
        };
      });
      setIsEditing(false);
      setNewFiles([]);
      setDeletedAttachmentIds([]);
    } catch {
      setError("수정 중 오류가 발생했습니다");
    } finally {
      setSaving(false);
      setUploadingFiles(false);
    }
  }

  // Delete handler
  function handleDeleteClick() {
    if (!report) return;
    if (report.status?.is_default) {
      setShowDeleteDialog(true);
    } else {
      setDeleteErrorMsg(
        `현재 제보 상태가 "${report.status?.status_name}"입니다. 접수대기 상태의 제보만 삭제할 수 있습니다.`
      );
      setShowDeleteErrorDialog(true);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    const token = getToken();

    try {
      const res = await fetch(`/api/reports/${reportNumber}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (res.ok) {
        setShowDeleteDialog(false);
        router.push(`/report/${companyCode}`);
      } else {
        setShowDeleteDialog(false);
        setDeleteErrorMsg(data.error || "삭제에 실패했습니다");
        setShowDeleteErrorDialog(true);
      }
    } catch {
      setShowDeleteDialog(false);
      setDeleteErrorMsg("삭제 중 오류가 발생했습니다");
      setShowDeleteErrorDialog(true);
    } finally {
      setDeleting(false);
    }
  }

  // File download
  async function handleDownload(attachmentId: string) {
    setDownloadingId(attachmentId);
    const token = getToken();

    try {
      const res = await fetch(`/api/reports/${reportNumber}/attachments/${attachmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        // Fetch file as blob to force download
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
      } else {
        setError("파일 다운로드에 실패했습니다");
      }
    } catch {
      setError("파일 다운로드 중 오류가 발생했습니다");
    } finally {
      setDownloadingId(null);
    }
  }

  // Comment file handlers
  function handleCommentFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const added = Array.from(e.target.files || []);
    const valid = added.filter((f) => ALLOWED_FILE_TYPES.includes(f.type) && f.size <= MAX_FILE_SIZE);
    const totalSize = [...commentFiles, ...valid].reduce((s, f) => s + f.size, 0);
    if (totalSize > 10 * 1024 * 1024) {
      setError("첨부파일 크기는 10MB를 초과할 수 없습니다");
      return;
    }
    setCommentFiles((prev) => [...prev, ...valid]);
    e.target.value = "";
  }

  function removeCommentFile(index: number) {
    setCommentFiles((prev) => prev.filter((_, i) => i !== index));
  }

  // Comment handler
  async function handleComment() {
    if (!newComment.trim() && commentFiles.length === 0) return;
    setCommenting(true);
    setCommentError("");

    const token = getToken();
    try {
      const res = await fetch(`/api/reports/${reportNumber}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: newComment || " ",
          authorType: "reporter",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        let attachments: { id: string; file_name: string; file_size: number }[] = [];

        // Upload files to the comment
        if (commentFiles.length > 0) {
          const formData = new FormData();
          formData.append("commentId", data.comment.id);
          formData.append("reporterToken", token || "");
          commentFiles.forEach((file) => formData.append("files", file));

          try {
            const uploadRes = await fetch(`/api/reports/${reportNumber}/comments/attachments`, {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
              body: formData,
            });

            if (uploadRes.ok) {
              const uploadData = await uploadRes.json();
              attachments = uploadData.attachments || [];
              if (uploadData.errors?.length > 0) {
                setCommentError(uploadData.errors.join("\n"));
              }
            } else {
              const errData = await uploadRes.json().catch(() => ({}));
              setCommentError(errData.error || "첨부파일 업로드에 실패했습니다");
            }
          } catch {
            setCommentError("첨부파일 업로드 중 오류가 발생했습니다");
          }
        }

        setComments([...comments, { ...data.comment, attachments }]);
        setNewComment("");
        setCommentFiles([]);
      } else {
        setCommentError("메시지 전송에 실패했습니다");
      }
    } catch {
      setCommentError("메시지 전송 중 오류가 발생했습니다");
    } finally {
      setCommenting(false);
    }
  }

  // Comment attachment download
  async function handleCommentAttachmentDownload(attachmentId: string) {
    setDownloadingCommentAttId(attachmentId);
    const token = getToken();
    try {
      const res = await fetch(`/api/reports/${reportNumber}/comments/attachments/${attachmentId}?token=${encodeURIComponent(token || "")}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
      setError("파일 다운로드에 실패했습니다");
    } finally {
      setDownloadingCommentAttId(null);
    }
  }

  // Comment attachment delete
  async function handleDeleteCommentAttachment(commentId: string, attachmentId: string) {
    const token = getToken();
    try {
      const res = await fetch(`/api/reports/${reportNumber}/comments/attachments/${attachmentId}?token=${encodeURIComponent(token || "")}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId
              ? { ...c, attachments: (c.attachments || []).filter((a) => a.id !== attachmentId) }
              : c
          )
        );
      }
    } catch {
      setError("파일 삭제에 실패했습니다");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (newComment.trim() || commentFiles.length > 0) {
        handleComment();
      }
    }
  }

  async function handleEditComment(commentId: string) {
    if (!editCommentContent.trim()) return;
    setSavingComment(true);
    const token = getToken();
    try {
      const res = await fetch(`/api/reports/${reportNumber}/comments`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ commentId, content: editCommentContent }),
      });
      if (res.ok) {
        setComments((prev) =>
          prev.map((c) => c.id === commentId ? { ...c, content: editCommentContent.trim() } : c)
        );
        setEditingCommentId(null);
      }
    } catch {
      setError("댓글 수정 중 오류가 발생했습니다");
    } finally {
      setSavingComment(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    const token = getToken();
    try {
      const res = await fetch(`/api/reports/${reportNumber}/comments?commentId=${commentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }
    } catch {
      setError("댓글 삭제 중 오류가 발생했습니다");
    }
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error && !report) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!report) return null;

  const publicComments = comments.filter((c) => !c.is_internal);

  return (
    <div className="space-y-6">
      {/* Report Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-xl">{t("reportInfo")}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge style={{ backgroundColor: report.status?.color_code, color: "white" }}>
                {report.status?.status_name}
              </Badge>
              {!isEditing && (
                <>
                  {report.status?.is_default && (
                    <>
                      <Button variant="outline" size="sm" onClick={startEdit}>
                        <Pencil className="h-4 w-4 mr-1" />
                        수정
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleDeleteClick} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4 mr-1" />
                        제보 취소
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">{t("reportNumber")}</span>
              <p className="font-mono font-bold">{report.report_number}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("reportDate")}</span>
              <p>{new Date(report.created_at).toLocaleString()}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("reportType")}</span>
              <p>{report.report_type?.type_name}</p>
            </div>
          </div>

          <Separator />

          {/* Title */}
          <div>
            <h3 className="font-semibold mb-2">{t("title")}</h3>
            {isEditing ? (
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="제목을 입력하세요"
                maxLength={40}
              />
            ) : (
              <p>{report.title}</p>
            )}
          </div>

          {/* Content */}
          <div>
            <h3 className="font-semibold mb-2">{t("content")}</h3>
            {isEditing ? (
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="내용을 입력하세요"
                rows={10}
                className="min-h-[240px]"
              />
            ) : (
              <div className="whitespace-pre-wrap break-words text-sm bg-muted/50 rounded-lg p-4">
                {report.content}
              </div>
            )}
          </div>

          {/* Edit buttons */}
          {isEditing && (
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={cancelEdit} disabled={saving || uploadingFiles}>
                <X className="h-4 w-4 mr-1" />
                취소
              </Button>
              <Button size="sm" onClick={saveEdit} disabled={saving || uploadingFiles}>
                {(saving || uploadingFiles) ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                {uploadingFiles ? "파일 업로드 중..." : "저장"}
              </Button>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Attachments */}
          <div>
            <h3 className="font-semibold mb-2">{t("attachments")}</h3>

            {/* Existing attachments */}
            {report.attachments?.length > 0 && (
              <div className="space-y-1 mb-2">
                {report.attachments.map((att) => {
                  const isMarkedForDelete = deletedAttachmentIds.includes(att.id);
                  return (
                    <div
                      key={att.id}
                      className={`flex items-center justify-between rounded px-3 py-2 text-sm ${
                        isMarkedForDelete ? "bg-destructive/10 line-through opacity-60" : "bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{att.file_name}</span>
                        <span className="text-muted-foreground shrink-0">
                          ({(att.file_size / 1024 / 1024).toFixed(1)}MB)
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {!isEditing && (
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
                        )}
                        {isEditing && !isMarkedForDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAttachmentForDelete(att.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                        {isEditing && isMarkedForDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => unmarkAttachmentForDelete(att.id)}
                          >
                            되돌리기
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* New files to upload (edit mode) */}
            {isEditing && (
              <>
                {newFiles.length > 0 && (
                  <div className="space-y-1 mb-2">
                    {newFiles.map((file, i) => (
                      <div key={i} className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded px-3 py-2 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <Upload className="h-4 w-4 shrink-0 text-primary" />
                          <span className="truncate">{file.name}</span>
                          <span className="text-muted-foreground shrink-0">
                            ({(file.size / 1024 / 1024).toFixed(1)}MB)
                          </span>
                          <Badge variant="outline" className="text-[10px] shrink-0">새 파일</Badge>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeNewFile(i)} className="text-destructive hover:text-destructive">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <div>
                  <Label htmlFor="edit-file-upload" className="cursor-pointer">
                    <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                      <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">파일 추가 (PDF, JPG, PNG, DOC, XLS / 개별 10MB, 총 50MB)</p>
                    </div>
                  </Label>
                  <Input
                    id="edit-file-upload"
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx"
                    onChange={handleEditFileChange}
                    className="hidden"
                  />
                </div>
              </>
            )}

            {!isEditing && report.attachments?.length === 0 && (
              <p className="text-sm text-muted-foreground">첨부파일이 없습니다</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Communication - Telegram Style */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t("comments")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Chat area */}
          <div className="px-4 py-3 space-y-3 max-h-[60vh] overflow-y-auto bg-muted/20">
            {publicComments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                아직 커뮤니케이션 내역이 없습니다
              </p>
            ) : (
              publicComments.map((comment) => {
                const isReporter = comment.author_type === "reporter";
                const isEditingThis = editingCommentId === comment.id;
                return (
                  <div
                    key={comment.id}
                    className={`group flex ${isReporter ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[75%] ${isReporter ? "items-end" : "items-start"}`}>
                      {/* Author label */}
                      <div className={`flex items-center gap-1 mb-0.5 ${isReporter ? "justify-end" : ""}`}>
                        {isReporter ? (
                          <User className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span className="text-[11px] text-muted-foreground">
                          {isReporter ? "나" : "담당자"}
                        </span>
                      </div>
                      {/* Bubble */}
                      {isEditingThis ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editCommentContent}
                            onChange={(e) => setEditCommentContent(e.target.value)}
                            rows={3}
                            className="text-sm min-h-[60px]"
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
                              onClick={() => handleEditComment(comment.id)}
                            >
                              {savingComment ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className={`flex items-end gap-1.5 ${isReporter ? "flex-row-reverse" : ""}`}>
                          <div className="space-y-1">
                            <div
                              className={`rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words ${
                                isReporter
                                  ? "bg-primary text-primary-foreground rounded-br-sm"
                                  : "bg-white dark:bg-muted border rounded-bl-sm"
                              }`}
                            >
                              {comment.content}
                            </div>
                            {/* Comment attachments */}
                            {comment.attachments?.length > 0 && (
                              <div className="space-y-1">
                                {comment.attachments.map((att) => (
                                  <div
                                    key={att.id}
                                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs ${
                                      isReporter ? "bg-primary/10" : "bg-muted"
                                    }`}
                                  >
                                    <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
                                    <button
                                      className="truncate hover:underline text-left"
                                      onClick={() => handleCommentAttachmentDownload(att.id)}
                                      disabled={downloadingCommentAttId === att.id}
                                    >
                                      {downloadingCommentAttId === att.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin inline" />
                                      ) : (
                                        att.file_name
                                      )}
                                    </button>
                                    {isReporter && (
                                      <button
                                        className="shrink-0 text-muted-foreground hover:text-destructive"
                                        onClick={() => handleDeleteCommentAttachment(comment.id, att.id)}
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-center gap-0.5 shrink-0 pb-0.5">
                            <span className="text-[10px] text-muted-foreground">
                              {formatTime(comment.created_at)}
                            </span>
                            {isReporter && (
                              <div className="hidden group-hover:flex gap-0.5">
                                <button
                                  className="text-muted-foreground hover:text-foreground p-0.5"
                                  onClick={() => {
                                    setEditingCommentId(comment.id);
                                    setEditCommentContent(comment.content);
                                  }}
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button
                                  className="text-muted-foreground hover:text-destructive p-0.5"
                                  onClick={() => handleDeleteComment(comment.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t p-3 space-y-2">
            {/* Upload error */}
            {commentError && (
              <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 whitespace-pre-line">
                {commentError}
              </div>
            )}
            {/* Selected files preview */}
            {commentFiles.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {commentFiles.map((file, i) => (
                  <div key={i} className="flex items-center gap-1 bg-muted rounded-full px-2.5 py-1 text-xs">
                    <FileText className="h-3 w-3 shrink-0" />
                    <span className="truncate max-w-[120px]">{file.name}</span>
                    <button onClick={() => removeCommentFile(i)} className="text-muted-foreground hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              첨부 가능: PDF, JPG, PNG, GIF, TXT, DOC, DOCX, XLS, XLSX (최대 10MB)
            </p>
            <div className="flex gap-2 items-end">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 h-10 w-10"
                onClick={() => commentFileRef.current?.click()}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <input
                ref={commentFileRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx,.txt"
                onChange={handleCommentFileChange}
                className="hidden"
              />
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="메시지를 입력하세요... (Shift+Enter로 줄바꿈)"
                rows={1}
                className="flex-1 resize-none min-h-[40px] max-h-[120px]"
              />
              <Button
                onClick={handleComment}
                disabled={commenting || (!newComment.trim() && commentFiles.length === 0)}
                size="icon"
                className="shrink-0 rounded-full h-10 w-10"
              >
                {commenting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              제보 취소
            </DialogTitle>
            <DialogDescription>
              이 제보를 정말 취소하시겠습니까? 취소된 제보는 복구할 수 없으며, 첨부파일과 모든 대화 내역이 함께 삭제됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={deleting}>
              돌아가기
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              제보 취소
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Error Dialog */}
      <Dialog open={showDeleteErrorDialog} onOpenChange={setShowDeleteErrorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              삭제 불가
            </DialogTitle>
            <DialogDescription>{deleteErrorMsg}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowDeleteErrorDialog(false)}>확인</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
