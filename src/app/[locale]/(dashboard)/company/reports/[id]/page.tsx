"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Send, Loader2, Download, FileText } from "lucide-react";
import { Link } from "@/i18n/routing";

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
  status: { id: string; status_name: string; status_name_en: string; color_code: string } | null;
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

export default function CompanyReportDetailPage() {
  const params = useParams();
  const reportId = params.id as string;
  const t = useTranslations("company");
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

  useEffect(() => {
    async function fetchData() {
      try {
        const [reportRes, commentsRes, statusesRes] = await Promise.all([
          fetch(`/api/reports/${reportId}`),
          fetch(`/api/reports/${reportId}/comments`),
          fetch("/api/company/report-statuses"),
        ]);
        if (reportRes.ok) {
          const data = await reportRes.json();
          setReport(data.report);
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
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchData();
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
        // Re-fetch report to get updated status
        const reportRes = await fetch(`/api/reports/${reportId}`);
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
                <Badge
                  style={report.status?.color_code ? { backgroundColor: report.status.color_code, color: "#fff" } : {}}
                >
                  {report.status?.status_name || "-"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{report.content}</p>
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
                    return (
                      <div
                        key={c.id}
                        className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                      >
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
                          <p className="whitespace-pre-wrap">{c.content}</p>
                          <p className={`text-xs mt-1 ${isMe ? (c.is_internal ? "text-yellow-600" : "text-primary-foreground/70") : "text-muted-foreground"} ${isMe ? "text-right" : ""}`}>
                            {new Date(c.created_at).toLocaleString("ko")}
                          </p>
                        </div>
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
        </div>
      </div>
    </div>
  );
}
