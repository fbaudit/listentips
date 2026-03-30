"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle2, UserCheck, Search, Flag, ArrowUpRight, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Staff { id: string; name: string; }

interface WorkflowProps {
  reportId: string;
  currentStatus: {
    assignedTo: string | null;
    assignedName?: string;
    acknowledgedAt: string | null;
    investigationStartedAt: string | null;
    resolvedAt: string | null;
    priority: string;
    aiUrgency: string | null;
    aiCategory: string | null;
  };
  staff: Staff[];
  onUpdate: () => void;
}

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  low: { label: "낮음", color: "bg-gray-100 text-gray-700" },
  medium: { label: "보통", color: "bg-blue-100 text-blue-700" },
  high: { label: "높음", color: "bg-orange-100 text-orange-700" },
  critical: { label: "긴급", color: "bg-red-100 text-red-700" },
};

export function ReportWorkflow({ reportId, currentStatus, staff, onUpdate }: WorkflowProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [assigneeId, setAssigneeId] = useState(currentStatus.assignedTo || "");
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolveSummary, setResolveSummary] = useState("");

  async function doAction(action: string, extra?: Record<string, string>) {
    setLoading(action);
    try {
      const res = await fetch(`/api/reports/${reportId}/workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      if (res.ok) {
        toast.success("처리되었습니다");
        onUpdate();
      } else {
        const data = await res.json();
        toast.error(data.error || "처리에 실패했습니다");
      }
    } catch {
      toast.error("서버 오류가 발생했습니다");
    } finally {
      setLoading(null);
    }
  }

  async function doClassify() {
    setLoading("classify");
    try {
      const res = await fetch(`/api/reports/${reportId}/classify`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        toast.success(`AI 분류: ${data.classification.category} (긴급도: ${data.classification.urgency})`);
        onUpdate();
      } else {
        toast.error("AI 분류에 실패했습니다");
      }
    } catch {
      toast.error("서버 오류가 발생했습니다");
    } finally {
      setLoading(null);
    }
  }

  const pri = PRIORITY_LABELS[currentStatus.priority] || PRIORITY_LABELS.medium;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Flag className="w-4 h-4" />
            사건 관리
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 현재 상태 */}
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="outline" className={pri.color}>우선순위: {pri.label}</Badge>
            {currentStatus.aiCategory && <Badge variant="outline">AI: {currentStatus.aiCategory}</Badge>}
            {currentStatus.aiUrgency && <Badge variant="outline">긴급도: {PRIORITY_LABELS[currentStatus.aiUrgency]?.label || currentStatus.aiUrgency}</Badge>}
            {currentStatus.acknowledgedAt && <Badge variant="outline" className="bg-emerald-50 text-emerald-700">접수 확인됨</Badge>}
            {currentStatus.investigationStartedAt && <Badge variant="outline" className="bg-blue-50 text-blue-700">조사 중</Badge>}
            {currentStatus.resolvedAt && <Badge variant="outline" className="bg-green-50 text-green-700">처리 완료</Badge>}
          </div>

          {/* 담당자 배정 */}
          <div className="flex items-center gap-2">
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger className="flex-1 h-9">
                <SelectValue placeholder="담당자 선택" />
              </SelectTrigger>
              <SelectContent>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" disabled={!assigneeId || loading === "assign"} onClick={() => doAction("assign", { assigneeId })}>
              {loading === "assign" ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3 h-3" />}
              <span className="ml-1">배정</span>
            </Button>
          </div>

          {/* 액션 버튼들 */}
          <div className="flex flex-wrap gap-2">
            {!currentStatus.acknowledgedAt && (
              <Button size="sm" variant="outline" disabled={loading === "acknowledge"} onClick={() => doAction("acknowledge")}>
                {loading === "acknowledge" ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                접수 확인
              </Button>
            )}
            {!currentStatus.investigationStartedAt && (
              <Button size="sm" variant="outline" disabled={loading === "start_investigation"} onClick={() => doAction("start_investigation")}>
                {loading === "start_investigation" ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Search className="w-3 h-3 mr-1" />}
                조사 시작
              </Button>
            )}
            {!currentStatus.resolvedAt && (
              <Button size="sm" variant="outline" onClick={() => setResolveDialogOpen(true)}>
                <CheckCircle2 className="w-3 h-3 mr-1" />
                처리 완료
              </Button>
            )}
            <Button size="sm" variant="outline" disabled={loading === "escalate"} onClick={() => doAction("escalate")}>
              {loading === "escalate" ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <ArrowUpRight className="w-3 h-3 mr-1" />}
              에스컬레이션
            </Button>
            <Button size="sm" variant="outline" disabled={loading === "classify"} onClick={doClassify}>
              {loading === "classify" ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
              AI 분류
            </Button>
          </div>

          {/* 우선순위 변경 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">우선순위:</span>
            {(["low", "medium", "high", "critical"] as const).map((p) => (
              <Button
                key={p}
                size="sm"
                variant={currentStatus.priority === p ? "default" : "ghost"}
                className="h-7 px-2 text-xs"
                disabled={loading === "set_priority"}
                onClick={() => doAction("set_priority", { priority: p })}
              >
                {PRIORITY_LABELS[p].label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 처리 완료 다이얼로그 */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>처리 완료</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              placeholder="처리 결과 요약을 입력하세요..."
              value={resolveSummary}
              onChange={(e) => setResolveSummary(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>취소</Button>
            <Button
              disabled={loading === "resolve"}
              onClick={() => {
                doAction("resolve", { summary: resolveSummary });
                setResolveDialogOpen(false);
              }}
            >
              {loading === "resolve" && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
              완료 처리
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
