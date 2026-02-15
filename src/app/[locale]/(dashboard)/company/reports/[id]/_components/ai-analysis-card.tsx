"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Copy, RotateCw, AlertTriangle, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

type AnalysisType = "summary" | "violation" | "investigation_plan" | "questionnaire" | "investigation_report";

interface AnalysisState {
  loading: boolean;
  result: Record<string, unknown> | null;
  error: string | null;
}

interface AIAnalysisCardProps {
  reportId: string;
}

function getEncryptionHeaders(): Record<string, string> {
  const key = typeof window !== "undefined" ? sessionStorage.getItem("encryptionKey") : null;
  return key ? { "x-encryption-key": key } : {};
}

export function AIAnalysisCard({ reportId }: AIAnalysisCardProps) {
  const [analyses, setAnalyses] = useState<Record<AnalysisType, AnalysisState>>({
    summary: { loading: false, result: null, error: null },
    violation: { loading: false, result: null, error: null },
    investigation_plan: { loading: false, result: null, error: null },
    questionnaire: { loading: false, result: null, error: null },
    investigation_report: { loading: false, result: null, error: null },
  });

  const generate = async (type: AnalysisType) => {
    setAnalyses((prev) => ({
      ...prev,
      [type]: { loading: true, result: null, error: null },
    }));

    try {
      const res = await fetch(`/api/reports/${reportId}/ai-analysis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getEncryptionHeaders(),
        },
        body: JSON.stringify({ analysisType: type }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAnalyses((prev) => ({
          ...prev,
          [type]: { loading: false, result: null, error: data.error || "분석에 실패했습니다" },
        }));
        return;
      }

      setAnalyses((prev) => ({
        ...prev,
        [type]: { loading: false, result: data.result, error: null },
      }));
    } catch {
      setAnalyses((prev) => ({
        ...prev,
        [type]: { loading: false, result: null, error: "네트워크 오류가 발생했습니다" },
      }));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("클립보드에 복사되었습니다");
  };

  // ── Renderers ──

  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" />
      <p className="text-sm">AI가 분석 중입니다...</p>
    </div>
  );

  const renderError = (error: string) => (
    <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      {error}
    </div>
  );

  const renderGenerateButton = (type: AnalysisType, label: string) => (
    <div className="flex flex-col items-center justify-center py-10 gap-3">
      <p className="text-sm text-muted-foreground">버튼을 클릭하여 AI 분석을 시작하세요</p>
      <Button onClick={() => generate(type)}>
        <Sparkles className="h-4 w-4 mr-2" />
        {label}
      </Button>
    </div>
  );

  const renderToolbar = (type: AnalysisType, copyText: string) => (
    <div className="flex gap-2 mb-3">
      <Button size="sm" variant="outline" onClick={() => generate(type)}>
        <RotateCw className="h-3.5 w-3.5 mr-1" />
        재생성
      </Button>
      <Button size="sm" variant="outline" onClick={() => copyToClipboard(copyText)}>
        <Copy className="h-3.5 w-3.5 mr-1" />
        복사
      </Button>
    </div>
  );

  // ── Tab: Summary ──

  const renderSummary = () => {
    const s = analyses.summary;
    if (s.loading) return renderLoading();
    if (s.error) return renderError(s.error);
    if (!s.result) return renderGenerateButton("summary", "제보 요약 생성");

    const text = (s.result.summary as string) || (s.result.raw as string) || "";
    return (
      <>
        {renderToolbar("summary", text)}
        <div className="bg-muted rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed">
          {text}
        </div>
      </>
    );
  };

  // ── Tab: Violation ──

  const renderViolation = () => {
    const s = analyses.violation;
    if (s.loading) return renderLoading();
    if (s.error) return renderError(s.error);
    if (!s.result) return renderGenerateButton("violation", "위반 분석 생성");

    // Handle raw text fallback
    if (s.result.raw) {
      const text = s.result.raw as string;
      return (
        <>
          {renderToolbar("violation", text)}
          <div className="bg-muted rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
            {text}
          </div>
        </>
      );
    }

    const violations = (s.result.violations as Array<{ law: string; article: string; description: string; severity: string }>) || [];
    const legalRisks = (s.result.legalRisks as string) || "";
    const recommendations = (s.result.recommendations as string) || "";

    const copyText = [
      "## 위반 가능성 분석",
      ...violations.map((v, i) => `\n${i + 1}. ${v.law} (${v.severity})\n   조항: ${v.article}\n   내용: ${v.description}`),
      `\n## 법적 리스크\n${legalRisks}`,
      `\n## 권고사항\n${recommendations}`,
    ].join("\n");

    return (
      <>
        {renderToolbar("violation", copyText)}
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {violations.length > 0 && (
            <div className="space-y-3">
              {violations.map((v, i) => (
                <div key={i} className="bg-muted rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{i + 1}. {v.law}</span>
                    <Badge
                      variant={v.severity === "심각" ? "destructive" : v.severity === "중간" ? "default" : "secondary"}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {v.severity}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">조항: {v.article}</p>
                  <p className="text-sm">{v.description}</p>
                </div>
              ))}
            </div>
          )}
          {legalRisks && (
            <div className="bg-muted rounded-lg p-3">
              <p className="font-medium text-sm mb-1">법적 리스크</p>
              <p className="text-sm whitespace-pre-wrap">{legalRisks}</p>
            </div>
          )}
          {recommendations && (
            <div className="bg-muted rounded-lg p-3">
              <p className="font-medium text-sm mb-1">권고사항</p>
              <p className="text-sm whitespace-pre-wrap">{recommendations}</p>
            </div>
          )}
        </div>
      </>
    );
  };

  // ── Tab: Investigation Plan ──

  const renderInvestigationPlan = () => {
    const s = analyses.investigation_plan;
    if (s.loading) return renderLoading();
    if (s.error) return renderError(s.error);
    if (!s.result) return renderGenerateButton("investigation_plan", "조사 계획 생성");

    // Handle raw text fallback
    if (s.result.raw) {
      const text = s.result.raw as string;
      return (
        <>
          {renderToolbar("investigation_plan", text)}
          <div className="bg-muted rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
            {text}
          </div>
        </>
      );
    }

    const { objective, scope, methods, interviewTargets, evidence, steps, precautions } = s.result as {
      objective?: string;
      scope?: string;
      methods?: string[];
      interviewTargets?: string[];
      evidence?: string[];
      steps?: Array<{ step: number; title: string; description: string; duration: string }>;
      precautions?: string[];
    };

    const copyText = [
      `## 조사 목적\n${objective || ""}`,
      `\n## 조사 범위\n${scope || ""}`,
      `\n## 조사 방법\n${(methods || []).map((m) => `- ${m}`).join("\n")}`,
      `\n## 인터뷰 대상\n${(interviewTargets || []).map((t) => `- ${t}`).join("\n")}`,
      `\n## 수집할 증거\n${(evidence || []).map((e) => `- ${e}`).join("\n")}`,
      `\n## 조사 단계\n${(steps || []).map((st) => `${st.step}. ${st.title} (${st.duration})\n   ${st.description}`).join("\n")}`,
      `\n## 주의사항\n${(precautions || []).map((p) => `- ${p}`).join("\n")}`,
    ].join("\n");

    return (
      <>
        {renderToolbar("investigation_plan", copyText)}
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {objective && (
            <div className="bg-muted rounded-lg p-3">
              <p className="font-medium text-sm mb-1">조사 목적</p>
              <p className="text-sm">{objective}</p>
            </div>
          )}
          {scope && (
            <div className="bg-muted rounded-lg p-3">
              <p className="font-medium text-sm mb-1">조사 범위</p>
              <p className="text-sm">{scope}</p>
            </div>
          )}
          {methods && methods.length > 0 && (
            <div className="bg-muted rounded-lg p-3">
              <p className="font-medium text-sm mb-1">조사 방법</p>
              <ul className="list-disc list-inside text-sm space-y-0.5">
                {methods.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </div>
          )}
          {interviewTargets && interviewTargets.length > 0 && (
            <div className="bg-muted rounded-lg p-3">
              <p className="font-medium text-sm mb-1">인터뷰 대상</p>
              <ul className="list-disc list-inside text-sm space-y-0.5">
                {interviewTargets.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          )}
          {evidence && evidence.length > 0 && (
            <div className="bg-muted rounded-lg p-3">
              <p className="font-medium text-sm mb-1">수집할 증거</p>
              <ul className="list-disc list-inside text-sm space-y-0.5">
                {evidence.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
          {steps && steps.length > 0 && (
            <div className="bg-muted rounded-lg p-3">
              <p className="font-medium text-sm mb-2">조사 단계</p>
              <div className="space-y-2">
                {steps.map((st) => (
                  <div key={st.step} className="flex gap-3 text-sm">
                    <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                      {st.step}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{st.title} <span className="text-muted-foreground font-normal">({st.duration})</span></p>
                      <p className="text-muted-foreground mt-0.5">{st.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {precautions && precautions.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="font-medium text-sm mb-1 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                주의사항
              </p>
              <ul className="list-disc list-inside text-sm space-y-0.5">
                {precautions.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}
        </div>
      </>
    );
  };

  // ── Tab: Questionnaire ──

  const renderQuestionnaire = () => {
    const s = analyses.questionnaire;
    if (s.loading) return renderLoading();
    if (s.error) return renderError(s.error);
    if (!s.result) return renderGenerateButton("questionnaire", "문답서 생성");

    // Handle raw text fallback
    if (s.result.raw) {
      const text = s.result.raw as string;
      return (
        <>
          {renderToolbar("questionnaire", text)}
          <div className="bg-muted rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
            {text}
          </div>
        </>
      );
    }

    const sections = (s.result.sections as Array<{
      title: string;
      target: string;
      questions: Array<{ question: string; purpose: string; followUp: string }>;
    }>) || [];
    const guidelines = (s.result.guidelines as string) || "";

    const copyText = [
      ...sections.map((sec) => [
        `## ${sec.title} (대상: ${sec.target})`,
        ...sec.questions.map((q, i) => `\nQ${i + 1}. ${q.question}\n   목적: ${q.purpose}\n   후속질문: ${q.followUp}`),
      ].join("\n")),
      guidelines ? `\n## 면담 시 유의사항\n${guidelines}` : "",
    ].join("\n\n");

    return (
      <>
        {renderToolbar("questionnaire", copyText)}
        <div className="space-y-4 max-h-[500px] overflow-y-auto">
          {sections.map((sec, si) => (
            <div key={si} className="bg-muted rounded-lg p-3 space-y-3">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm">{sec.title}</p>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{sec.target}</Badge>
              </div>
              <div className="space-y-3">
                {sec.questions.map((q, qi) => (
                  <div key={qi} className="border-l-2 border-primary/30 pl-3 space-y-1">
                    <p className="text-sm font-medium">Q{qi + 1}. {q.question}</p>
                    <p className="text-xs text-muted-foreground">목적: {q.purpose}</p>
                    {q.followUp && (
                      <p className="text-xs text-muted-foreground">후속질문: {q.followUp}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {guidelines && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="font-medium text-sm mb-1 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                면담 시 유의사항
              </p>
              <p className="text-sm whitespace-pre-wrap">{guidelines}</p>
            </div>
          )}
        </div>
      </>
    );
  };

  // ── Tab: Investigation Report ──

  const renderInvestigationReport = () => {
    const s = analyses.investigation_report;
    if (s.loading) return renderLoading();
    if (s.error) return renderError(s.error);
    if (!s.result) return renderGenerateButton("investigation_report", "조사 보고서 초안 생성");

    const draft = (s.result.reportDraft as string) || (s.result.raw as string) || "";
    return (
      <>
        {renderToolbar("investigation_report", draft)}
        <div className="bg-muted rounded-lg p-4 max-h-[500px] overflow-y-auto prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground/90">
          <ReactMarkdown>{draft}</ReactMarkdown>
        </div>
      </>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI 분석
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="summary">
          <TabsList className="w-full">
            <TabsTrigger value="summary" className="flex-1 text-xs sm:text-sm">
              <ClipboardCheck className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
              요약
            </TabsTrigger>
            <TabsTrigger value="violation" className="flex-1 text-xs sm:text-sm">
              <AlertTriangle className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
              위반 분석
            </TabsTrigger>
            <TabsTrigger value="investigation_plan" className="flex-1 text-xs sm:text-sm">
              조사 계획
            </TabsTrigger>
            <TabsTrigger value="questionnaire" className="flex-1 text-xs sm:text-sm">
              문답서
            </TabsTrigger>
            <TabsTrigger value="investigation_report" className="flex-1 text-xs sm:text-sm">
              보고서 초안
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="mt-4">
            {renderSummary()}
          </TabsContent>
          <TabsContent value="violation" className="mt-4">
            {renderViolation()}
          </TabsContent>
          <TabsContent value="investigation_plan" className="mt-4">
            {renderInvestigationPlan()}
          </TabsContent>
          <TabsContent value="questionnaire" className="mt-4">
            {renderQuestionnaire()}
          </TabsContent>
          <TabsContent value="investigation_report" className="mt-4">
            {renderInvestigationReport()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
