"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { sanitizeHtml } from "@/lib/utils/sanitize";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Check, X, Loader2, Building2, User, Settings } from "lucide-react";
import { Link } from "@/i18n/routing";
import { toast } from "sonner";

interface ApplicationDetail {
  id: string;
  company_name: string;
  business_number: string | null;
  industry: string | null;
  employee_count: number | null;
  address: string | null;
  department: string | null;
  channel_name: string | null;
  report_types: string[];
  welcome_message: string | null;
  report_guide_message: string | null;
  content_blocks: Array<{ id: string; content: string; order: number }> | null;
  preferred_locale: string;
  use_ai_validation: boolean;
  use_chatbot: boolean;
  admin_name: string;
  admin_email: string;
  admin_phone: string | null;
  admin_username: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  review_notes: string | null;
}

export default function AdminApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const appId = params.id as string;
  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [processingAction, setProcessingAction] = useState<"approve" | "reject" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchApp() {
      try {
        const res = await fetch(`/api/applications/${appId}`);
        if (res.ok) setApplication(await res.json());
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchApp();
  }, [appId]);

  const handleAction = async (action: "approve" | "reject") => {
    setProcessingAction(action);
    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reviewNotes }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        if (data.companyCode) {
          toast.success(`기업 코드: ${data.companyCode}`);
        }
        router.push("/admin/applications");
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("처리 중 오류가 발생했습니다");
    } finally {
      setProcessingAction(null);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  if (!application) {
    return <div className="text-center py-20 text-muted-foreground">신청을 찾을 수 없습니다</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/applications"><ArrowLeft className="w-4 h-4 mr-2" />목록으로</Link>
        </Button>
        <Badge variant={application.status === "pending" ? "outline" : application.status === "approved" ? "default" : "destructive"}>
          {application.status === "pending" ? "대기" : application.status === "approved" ? "승인" : "거절"}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" />기업 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-muted-foreground">회사명:</span> {application.company_name}</div>
              {application.business_number && <div><span className="text-muted-foreground">사업자번호:</span> {application.business_number}</div>}
              {application.industry && <div><span className="text-muted-foreground">업종:</span> {application.industry}</div>}
              {application.employee_count && <div><span className="text-muted-foreground">직원 수:</span> {application.employee_count}명</div>}
              {application.address && <div className="col-span-2"><span className="text-muted-foreground">주소:</span> {application.address}</div>}
              {application.department && <div><span className="text-muted-foreground">담당부서:</span> {application.department}</div>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="w-5 h-5" />담당자 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-muted-foreground">이름:</span> {application.admin_name}</div>
              <div><span className="text-muted-foreground">이메일:</span> {application.admin_email}</div>
              {application.admin_phone && <div><span className="text-muted-foreground">전화번호:</span> {application.admin_phone}</div>}
              <div><span className="text-muted-foreground">아이디:</span> {application.admin_username}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5" />채널 설정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {application.channel_name && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">채널 이름</span>
                <span>{application.channel_name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">선호 언어</span>
              <span>{application.preferred_locale}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">AI 검증</span>
              <Badge variant={application.use_ai_validation ? "default" : "secondary"}>
                {application.use_ai_validation ? "사용" : "미사용"}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">AI 챗봇</span>
              <Badge variant={application.use_chatbot ? "default" : "secondary"}>
                {application.use_chatbot ? "사용" : "미사용"}
              </Badge>
            </div>
            {application.welcome_message && (
              <>
                <Separator />
                <div>
                  <span className="text-muted-foreground">안내 메시지:</span>
                  <p className="mt-1">{application.welcome_message}</p>
                </div>
              </>
            )}
            {application.report_guide_message && (
              <div>
                <span className="text-muted-foreground">제보내용 안내문구:</span>
                <p className="mt-1">{application.report_guide_message}</p>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">제보 유형:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {application.report_types?.map((type) => (
                  <Badge key={type} variant="secondary" className="text-xs">{type}</Badge>
                ))}
              </div>
            </div>
            {application.content_blocks && application.content_blocks.length > 0 && (
              <>
                <Separator />
                <div>
                  <span className="text-muted-foreground">채널 메인 안내 블록:</span>
                  <div className="mt-2 space-y-2">
                    {application.content_blocks.map((block) => (
                      <div
                        key={block.id}
                        className="rounded border p-3 prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.content) }}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {application.status === "pending" && (
          <Card>
            <CardHeader>
              <CardTitle>검토</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notes">검토 메모</Label>
                <Textarea
                  id="notes"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="검토 내용을 입력하세요 (선택)"
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => handleAction("approve")}
                  disabled={processingAction !== null}
                  className="flex-1"
                >
                  {processingAction === "approve" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                  승인
                </Button>
                <Button
                  onClick={() => handleAction("reject")}
                  disabled={processingAction !== null}
                  variant="destructive"
                  className="flex-1"
                >
                  {processingAction === "reject" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <X className="w-4 h-4 mr-2" />}
                  거절
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
