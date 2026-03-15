"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Sparkles, Copy, RotateCw, AlertTriangle, ClipboardCheck, Save, ShieldCheck, Regex, Plus, X, Trash2, Settings } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { sanitizeHtml } from "@/lib/utils/sanitize";
import type { DeidentifiedData } from "@/types/database";
import {
  DEIDENTIFICATION_PROMPT,
  REPORT_SUMMARY_PROMPT,
  VIOLATION_ANALYSIS_PROMPT,
  INVESTIGATION_PLAN_PROMPT,
  QUESTIONNAIRE_PROMPT,
  INVESTIGATION_REPORT_PROMPT,
  COMMENT_AUTO_REPLY_PROMPT,
} from "@/lib/ai/prompts";

const DEFAULT_PROMPTS: Record<string, string> = {
  deidentification: DEIDENTIFICATION_PROMPT,
  summary: REPORT_SUMMARY_PROMPT,
  violation: VIOLATION_ANALYSIS_PROMPT,
  investigation_plan: INVESTIGATION_PLAN_PROMPT,
  questionnaire: QUESTIONNAIRE_PROMPT,
  investigation_report: INVESTIGATION_REPORT_PROMPT,
  auto_reply: COMMENT_AUTO_REPLY_PROMPT,
};

type AnalysisType = "deidentification" | "summary" | "violation" | "investigation_plan" | "questionnaire" | "investigation_report";

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
  const t = useTranslations("aiAnalysis");
  const tc = useTranslations("common");
  const [analyses, setAnalyses] = useState<Record<AnalysisType, AnalysisState>>({
    deidentification: { loading: false, result: null, error: null },
    summary: { loading: false, result: null, error: null },
    violation: { loading: false, result: null, error: null },
    investigation_plan: { loading: false, result: null, error: null },
    questionnaire: { loading: false, result: null, error: null },
    investigation_report: { loading: false, result: null, error: null },
  });
  const [saving, setSaving] = useState(false);
  const [savedToDb, setSavedToDb] = useState(false);
  const [deidentifyMethod, setDeidentifyMethod] = useState<"regex" | "ai">("regex");
  const [manualOriginal, setManualOriginal] = useState("");
  const [manualPlaceholder, setManualPlaceholder] = useState("");
  const [manualCategory, setManualCategory] = useState("인물");
  const [savedAnalyses, setSavedAnalyses] = useState<Partial<Record<AnalysisType, boolean>>>({});
  const [savingType, setSavingType] = useState<AnalysisType | null>(null);

  // Prompt editor state
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);
  const [editingPromptType, setEditingPromptType] = useState<AnalysisType | "auto_reply" | null>(null);
  const [editingPromptText, setEditingPromptText] = useState("");
  const [customPrompts, setCustomPrompts] = useState<Record<string, string>>({});
  const [savingPrompt, setSavingPrompt] = useState(false);

  // Load custom prompts on mount
  useEffect(() => {
    const loadPrompts = async () => {
      try {
        const res = await fetch("/api/company/ai-prompts");
        if (res.ok) {
          const data = await res.json();
          const map: Record<string, string> = {};
          for (const p of data.prompts || []) {
            map[p.prompt_type] = p.prompt_template;
          }
          setCustomPrompts(map);
        }
      } catch {
        // Silent fail
      }
    };
    loadPrompts();
  }, []);

  // Load saved de-identified data on mount
  useEffect(() => {
    const loadSaved = async () => {
      try {
        const res = await fetch(`/api/reports/${reportId}/deidentify`, {
          headers: getEncryptionHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.deidentifiedData) {
            setAnalyses((prev) => ({
              ...prev,
              deidentification: { loading: false, result: data.deidentifiedData, error: null },
            }));
            setSavedToDb(true);
          }
        }
      } catch {
        // Silent fail
      }
    };
    loadSaved();
  }, [reportId]);

  // Load saved AI analysis results on mount
  useEffect(() => {
    const loadAIResults = async () => {
      try {
        const res = await fetch(`/api/reports/${reportId}/ai-results`, {
          headers: getEncryptionHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.results) {
            const results = data.results as Record<string, Record<string, unknown>>;
            const saved: Partial<Record<AnalysisType, boolean>> = {};
            const updates: Partial<Record<AnalysisType, AnalysisState>> = {};
            for (const [key, value] of Object.entries(results)) {
              const type = key as AnalysisType;
              saved[type] = true;
              updates[type] = { loading: false, result: value, error: null };
            }
            setSavedAnalyses(saved);
            setAnalyses((prev) => ({ ...prev, ...updates }));
          }
        }
      } catch {
        // Silent fail
      }
    };
    loadAIResults();
  }, [reportId]);

  const generate = async (type: AnalysisType, method?: "regex" | "ai") => {
    if (type === "deidentification") {
      setSavedToDb(false);
    } else {
      setSavedAnalyses((prev) => ({ ...prev, [type]: false }));
    }

    setAnalyses((prev) => ({
      ...prev,
      [type]: { loading: true, result: null, error: null },
    }));

    try {
      const bodyPayload: Record<string, string> = { analysisType: type };
      if (type === "deidentification" && method) {
        bodyPayload.method = method;
      }

      const res = await fetch(`/api/reports/${reportId}/ai-analysis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getEncryptionHeaders(),
        },
        body: JSON.stringify(bodyPayload),
      });

      const data = await res.json();

      if (!res.ok) {
        setAnalyses((prev) => ({
          ...prev,
          [type]: { loading: false, result: null, error: data.error || t("analysisError") },
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
        [type]: { loading: false, result: null, error: t("networkError") },
      }));
    }
  };

  const saveDeidentification = async () => {
    const result = analyses.deidentification.result;
    if (!result) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/reports/${reportId}/deidentify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getEncryptionHeaders(),
        },
        body: JSON.stringify({ deidentifiedData: result }),
      });
      if (res.ok) {
        setSavedToDb(true);
        toast.success(t("deidentifySaved"));
      } else {
        const data = await res.json();
        toast.error(data.error || t("deidentifySaveError"));
      }
    } catch {
      toast.error(t("networkError"));
    } finally {
      setSaving(false);
    }
  };

  const deleteDeidentification = async () => {
    // Clear local state
    setAnalyses((prev) => ({
      ...prev,
      deidentification: { loading: false, result: null, error: null },
    }));

    // If saved to DB, delete from DB too
    if (savedToDb) {
      try {
        await fetch(`/api/reports/${reportId}/deidentify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getEncryptionHeaders(),
          },
          body: JSON.stringify({ deidentifiedData: null, delete: true }),
        });
      } catch {
        // Silent — local state already cleared
      }
    }
    setSavedToDb(false);
    toast.success(t("deidentifyDeleted"));
  };

  const saveAnalysis = async (type: AnalysisType) => {
    const result = analyses[type].result;
    if (!result) return;

    setSavingType(type);
    try {
      const res = await fetch(`/api/reports/${reportId}/ai-results`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getEncryptionHeaders(),
        },
        body: JSON.stringify({ analysisType: type, result }),
      });
      if (res.ok) {
        setSavedAnalyses((prev) => ({ ...prev, [type]: true }));
        toast.success(t("analysisSaved"));
      } else {
        const data = await res.json();
        toast.error(data.error || t("analysisSaveError"));
      }
    } catch {
      toast.error(t("networkError"));
    } finally {
      setSavingType(null);
    }
  };

  const deleteAnalysis = async (type: AnalysisType) => {
    // Clear local state
    setAnalyses((prev) => ({
      ...prev,
      [type]: { loading: false, result: null, error: null },
    }));

    // If saved to DB, delete from DB
    if (savedAnalyses[type]) {
      try {
        await fetch(`/api/reports/${reportId}/ai-results`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getEncryptionHeaders(),
          },
          body: JSON.stringify({ analysisType: type, delete: true }),
        });
      } catch {
        // Silent — local state already cleared
      }
    }
    setSavedAnalyses((prev) => ({ ...prev, [type]: false }));
    toast.success(t("analysisDeleted"));
  };

  const CATEGORIES = ["인물", "연락처", "이메일", "장소", "신분증번호", "기관", "금융정보", "기타"];

  /** Replace all occurrences in de-identified data fields */
  const replaceInResult = (
    result: DeidentifiedData,
    search: string,
    replacement: string,
  ): DeidentifiedData => {
    const replaceAll = (str: string) => str.split(search).join(replacement);
    return {
      ...result,
      deidentifiedTitle: replaceAll(result.deidentifiedTitle || ""),
      deidentifiedContent: replaceAll(result.deidentifiedContent || ""),
      deidentifiedFields: result.deidentifiedFields
        ? {
            who_field: replaceAll(result.deidentifiedFields.who_field),
            what_field: replaceAll(result.deidentifiedFields.what_field),
            when_field: replaceAll(result.deidentifiedFields.when_field),
            where_field: replaceAll(result.deidentifiedFields.where_field),
            why_field: replaceAll(result.deidentifiedFields.why_field),
            how_field: replaceAll(result.deidentifiedFields.how_field),
          }
        : result.deidentifiedFields,
      mappingTable: result.mappingTable,
      generatedAt: result.generatedAt,
    };
  };

  const applyManualMapping = () => {
    if (!manualOriginal.trim() || !manualPlaceholder.trim()) return;
    const current = analyses.deidentification.result;
    if (!current) return;

    const result = current as unknown as DeidentifiedData;
    const updated = replaceInResult(result, manualOriginal.trim(), manualPlaceholder.trim());
    updated.mappingTable = [
      ...(updated.mappingTable || []),
      { original: manualOriginal.trim(), placeholder: manualPlaceholder.trim(), category: manualCategory },
    ];

    setAnalyses((prev) => ({
      ...prev,
      deidentification: { ...prev.deidentification, result: updated as unknown as Record<string, unknown> },
    }));
    setSavedToDb(false);
    setManualOriginal("");
    setManualPlaceholder("");
  };

  const removeMapping = (index: number) => {
    const current = analyses.deidentification.result;
    if (!current) return;

    const result = current as unknown as DeidentifiedData;
    const entry = result.mappingTable?.[index];
    if (!entry) return;

    // Reverse: replace placeholder back with original
    const updated = replaceInResult(result, entry.placeholder, entry.original);
    updated.mappingTable = (result.mappingTable || []).filter((_, i) => i !== index);

    setAnalyses((prev) => ({
      ...prev,
      deidentification: { ...prev.deidentification, result: updated as unknown as Record<string, unknown> },
    }));
    setSavedToDb(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t("copiedToClipboard"));
  };

  const PROMPT_TYPE_LABELS: Record<string, string> = {
    deidentification: t("deidentification"),
    summary: t("summary"),
    violation: t("violation"),
    investigation_plan: t("investigationPlan"),
    questionnaire: t("questionnaire"),
    investigation_report: t("investigationReport"),
    auto_reply: t("autoReplyPrompt"),
  };

  const openPromptEditor = (type: AnalysisType | "auto_reply") => {
    setEditingPromptType(type);
    setEditingPromptText(customPrompts[type] || DEFAULT_PROMPTS[type] || "");
    setPromptDialogOpen(true);
  };

  const saveCustomPrompt = async () => {
    if (!editingPromptType || !editingPromptText.trim()) return;
    setSavingPrompt(true);
    try {
      const res = await fetch("/api/company/ai-prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptType: editingPromptType,
          promptTemplate: editingPromptText,
        }),
      });
      if (res.ok) {
        setCustomPrompts((prev) => ({ ...prev, [editingPromptType!]: editingPromptText }));
        toast.success(t("promptSaved"));
        setPromptDialogOpen(false);
      } else {
        const data = await res.json();
        toast.error(data.error || t("promptSaveError"));
      }
    } catch {
      toast.error(t("networkError"));
    } finally {
      setSavingPrompt(false);
    }
  };

  const resetPromptToDefault = async () => {
    if (!editingPromptType) return;
    setSavingPrompt(true);
    try {
      const res = await fetch(`/api/company/ai-prompts?promptType=${editingPromptType}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setCustomPrompts((prev) => {
          const next = { ...prev };
          delete next[editingPromptType!];
          return next;
        });
        setEditingPromptText(DEFAULT_PROMPTS[editingPromptType!] || "");
        toast.success(t("promptReset"));
        setPromptDialogOpen(false);
      }
    } catch {
      toast.error(t("networkError"));
    } finally {
      setSavingPrompt(false);
    }
  };

  // ── Renderers ──

  const renderLoading = (message?: string) => (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" />
      <p className="text-sm">{message || t("analyzing")}</p>
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
      <p className="text-sm text-muted-foreground">{t("generatePrompt")}</p>
      <div className="flex gap-2">
        <Button onClick={() => generate(type)}>
          <Sparkles className="h-4 w-4 mr-2" />
          {label}
        </Button>
        <Button size="icon" variant="ghost" onClick={() => openPromptEditor(type)} title={t("editPrompt")}>
          <Settings className="h-4 w-4" />
        </Button>
      </div>
      {customPrompts[type] && (
        <p className="text-xs text-blue-600 dark:text-blue-400">{t("customPromptActive")}</p>
      )}
    </div>
  );

  const renderToolbar = (type: AnalysisType, copyText: string) => {
    const isSaved = savedAnalyses[type] === true;
    const isSaving = savingType === type;
    return (
      <div className="flex gap-2 mb-3 flex-wrap">
        <Button size="sm" variant="outline" onClick={() => generate(type)}>
          <RotateCw className="h-3.5 w-3.5 mr-1" />
          {t("regenerate")}
        </Button>
        <Button size="sm" variant="outline" onClick={() => copyToClipboard(copyText)}>
          <Copy className="h-3.5 w-3.5 mr-1" />
          {tc("copy")}
        </Button>
        <Button
          size="sm"
          variant={isSaved ? "outline" : "default"}
          onClick={() => saveAnalysis(type)}
          disabled={isSaving || isSaved}
        >
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5 mr-1" />
          )}
          {isSaved ? t("analysisSavedLabel") : tc("save")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => deleteAnalysis(type)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          {tc("delete")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => openPromptEditor(type)}
          title={t("editPrompt")}
        >
          <Settings className="h-3.5 w-3.5 mr-1" />
          {t("editPrompt")}
        </Button>
      </div>
    );
  };

  // ── Tab: Deidentification ──

  const renderDeidentification = () => {
    const s = analyses.deidentification;
    if (s.loading) return renderLoading(t("analyzingDeidentification"));
    if (s.error) return renderError(s.error);
    if (!s.result) {
      return (
        <div className="flex flex-col items-center justify-center py-10 gap-4">
          <p className="text-sm text-muted-foreground">{t("generatePrompt")}</p>
          {/* Mode toggle */}
          <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
            <button
              type="button"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                deidentifyMethod === "regex"
                  ? "bg-background shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setDeidentifyMethod("regex")}
            >
              <Regex className="h-3.5 w-3.5" />
              {t("basicMode")}
            </button>
            <button
              type="button"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                deidentifyMethod === "ai"
                  ? "bg-background shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setDeidentifyMethod("ai")}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t("aiMode")}
            </button>
          </div>
          <p className="text-xs text-muted-foreground max-w-sm text-center">
            {deidentifyMethod === "regex" ? t("basicModeDesc") : t("aiModeDesc")}
          </p>
          <Button onClick={() => generate("deidentification", deidentifyMethod)}>
            {deidentifyMethod === "regex" ? (
              <Regex className="h-4 w-4 mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {t("generateDeidentification")}
          </Button>
        </div>
      );
    }

    const result = s.result as unknown as DeidentifiedData;
    const mappingTable = result.mappingTable || [];
    const deidentifiedContent = result.deidentifiedContent || (s.result.raw as string) || "";
    const deidentifiedTitle = result.deidentifiedTitle || "";

    const copyText = [
      `## ${t("deidentifiedTitle")}`,
      deidentifiedTitle,
      `\n## ${t("deidentifiedContent")}`,
      deidentifiedContent,
      `\n## ${t("mappingTable")}`,
      ...mappingTable.map((m) => `- ${m.placeholder}: ${m.original} (${m.category})`),
    ].join("\n");

    const fieldLabels: Record<string, string> = {
      who_field: t("field_who_field"),
      what_field: t("field_what_field"),
      when_field: t("field_when_field"),
      where_field: t("field_where_field"),
      why_field: t("field_why_field"),
      how_field: t("field_how_field"),
    };

    return (
      <>
        {/* Toolbar with Save/Delete buttons */}
        <div className="flex gap-2 mb-3 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => generate("deidentification", "regex")}>
            <Regex className="h-3.5 w-3.5 mr-1" />
            {t("regenerateRegex")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => generate("deidentification", "ai")}>
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            {t("regenerateAi")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => copyToClipboard(copyText)}>
            <Copy className="h-3.5 w-3.5 mr-1" />
            {tc("copy")}
          </Button>
          <Button
            size="sm"
            variant={savedToDb ? "outline" : "default"}
            onClick={saveDeidentification}
            disabled={saving || savedToDb}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5 mr-1" />
            )}
            {savedToDb ? t("deidentifySavedLabel") : tc("save")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={deleteDeidentification}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            {tc("delete")}
          </Button>
        </div>

        {/* De-identified content display */}
        <div className="space-y-4 max-h-[500px] overflow-y-auto">
          {/* De-identified title */}
          {deidentifiedTitle && (
            <div className="bg-muted rounded-lg p-3">
              <p className="font-medium text-sm mb-1">{t("deidentifiedTitle")}</p>
              <div className="text-sm" dangerouslySetInnerHTML={{ __html: sanitizeHtml(deidentifiedTitle) }} />
            </div>
          )}

          {/* De-identified content */}
          <div
            className="bg-muted rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(deidentifiedContent) }}
          />

          {/* De-identified 5W1H fields */}
          {result.deidentifiedFields && (
            <div className="bg-muted rounded-lg p-3">
              <p className="font-medium text-sm mb-2">{t("deidentifiedFields")}</p>
              <div className="grid gap-2 sm:grid-cols-2 text-sm">
                {Object.entries(result.deidentifiedFields).map(([key, value]) =>
                  value && value !== "정보 없음" ? (
                    <div key={key}>
                      <span className="font-medium text-muted-foreground">
                        {fieldLabels[key] || key}:
                      </span>{" "}
                      <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(String(value)) }} />
                    </div>
                  ) : null
                )}
              </div>
            </div>
          )}

          {/* Mapping Table */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <p className="font-medium text-sm mb-2 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
              {t("mappingTable")} ({mappingTable.length})
            </p>
            {mappingTable.length > 0 && (
              <div className="space-y-1 mb-3">
                {mappingTable.map((m, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs group">
                    <button
                      type="button"
                      onClick={() => removeMapping(i)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                      title={tc("delete")}
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                      {m.category}
                    </Badge>
                    <code className="bg-primary/10 px-1.5 py-0.5 rounded text-primary font-mono">
                      {m.placeholder}
                    </code>
                    <span className="text-muted-foreground">&larr;</span>
                    <span className="text-muted-foreground line-through truncate">
                      {m.original}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Manual add form */}
            <div className="border-t border-amber-200 dark:border-amber-800 pt-3">
              <p className="text-xs text-muted-foreground mb-2">
                {t("manualAddHint")}
              </p>
              <div className="flex gap-2 flex-wrap items-end">
                <div className="flex-1 min-w-[120px]">
                  <label className="text-[10px] text-muted-foreground mb-0.5 block">{t("manualAddOriginal")}</label>
                  <Input
                    value={manualOriginal}
                    onChange={(e) => setManualOriginal(e.target.value)}
                    placeholder="홍길동"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <label className="text-[10px] text-muted-foreground mb-0.5 block">{t("manualAddPlaceholder")}</label>
                  <Input
                    value={manualPlaceholder}
                    onChange={(e) => setManualPlaceholder(e.target.value)}
                    placeholder="[인물A]"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="w-[100px]">
                  <label className="text-[10px] text-muted-foreground mb-0.5 block">{t("manualAddCategory")}</label>
                  <Select value={manualCategory} onValueChange={setManualCategory}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat} className="text-xs">
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={applyManualMapping}
                  disabled={!manualOriginal.trim() || !manualPlaceholder.trim()}
                  className="h-8"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  {t("addMapping")}
                </Button>
              </div>
            </div>
          </div>

          {/* Notice about other tabs using de-identified content */}
          {savedToDb && (
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <p className="text-sm text-green-700 dark:text-green-300">
                {t("deidentifyAppliedNotice")}
              </p>
            </div>
          )}
        </div>
      </>
    );
  };

  // ── Tab: Summary ──

  const renderSummary = () => {
    const s = analyses.summary;
    if (s.loading) return renderLoading(t("analyzingSummary"));
    if (s.error) return renderError(s.error);
    if (!s.result) return renderGenerateButton("summary", t("generateSummary"));

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
    if (s.loading) return renderLoading(t("analyzingViolation"));
    if (s.error) return renderError(s.error);
    if (!s.result) return renderGenerateButton("violation", t("generateViolation"));

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
      `## ${t("violationAnalysis")}`,
      ...violations.map((v, i) => `\n${i + 1}. ${v.law} (${v.severity})\n   ${t("article")}: ${v.article}\n   ${v.description}`),
      `\n## ${t("legalRisks")}\n${legalRisks}`,
      `\n## ${t("recommendations")}\n${recommendations}`,
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
                  <p className="text-xs text-muted-foreground">{t("article")}: {v.article}</p>
                  <p className="text-sm">{v.description}</p>
                </div>
              ))}
            </div>
          )}
          {legalRisks && (
            <div className="bg-muted rounded-lg p-3">
              <p className="font-medium text-sm mb-1">{t("legalRisks")}</p>
              <p className="text-sm whitespace-pre-wrap">{legalRisks}</p>
            </div>
          )}
          {recommendations && (
            <div className="bg-muted rounded-lg p-3">
              <p className="font-medium text-sm mb-1">{t("recommendations")}</p>
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
    if (s.loading) return renderLoading(t("analyzingPlan"));
    if (s.error) return renderError(s.error);
    if (!s.result) return renderGenerateButton("investigation_plan", t("generatePlan"));

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
      `## ${t("objective")}\n${objective || ""}`,
      `\n## ${t("scope")}\n${scope || ""}`,
      `\n## ${t("methods")}\n${(methods || []).map((m) => `- ${m}`).join("\n")}`,
      `\n## ${t("interviewTargets")}\n${(interviewTargets || []).map((it) => `- ${it}`).join("\n")}`,
      `\n## ${t("evidence")}\n${(evidence || []).map((e) => `- ${e}`).join("\n")}`,
      `\n## ${t("steps")}\n${(steps || []).map((st) => `${st.step}. ${st.title} (${st.duration})\n   ${st.description}`).join("\n")}`,
      `\n## ${t("precautions")}\n${(precautions || []).map((p) => `- ${p}`).join("\n")}`,
    ].join("\n");

    return (
      <>
        {renderToolbar("investigation_plan", copyText)}
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {objective && (
            <div className="bg-muted rounded-lg p-3">
              <p className="font-medium text-sm mb-1">{t("objective")}</p>
              <p className="text-sm">{objective}</p>
            </div>
          )}
          {scope && (
            <div className="bg-muted rounded-lg p-3">
              <p className="font-medium text-sm mb-1">{t("scope")}</p>
              <p className="text-sm">{scope}</p>
            </div>
          )}
          {methods && methods.length > 0 && (
            <div className="bg-muted rounded-lg p-3">
              <p className="font-medium text-sm mb-1">{t("methods")}</p>
              <ul className="list-disc list-inside text-sm space-y-0.5">
                {methods.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </div>
          )}
          {interviewTargets && interviewTargets.length > 0 && (
            <div className="bg-muted rounded-lg p-3">
              <p className="font-medium text-sm mb-1">{t("interviewTargets")}</p>
              <ul className="list-disc list-inside text-sm space-y-0.5">
                {interviewTargets.map((it, i) => <li key={i}>{it}</li>)}
              </ul>
            </div>
          )}
          {evidence && evidence.length > 0 && (
            <div className="bg-muted rounded-lg p-3">
              <p className="font-medium text-sm mb-1">{t("evidence")}</p>
              <ul className="list-disc list-inside text-sm space-y-0.5">
                {evidence.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
          {steps && steps.length > 0 && (
            <div className="bg-muted rounded-lg p-3">
              <p className="font-medium text-sm mb-2">{t("steps")}</p>
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
                {t("precautions")}
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
    if (s.loading) return renderLoading(t("analyzingQuestionnaire"));
    if (s.error) return renderError(s.error);
    if (!s.result) return renderGenerateButton("questionnaire", t("generateQuestionnaire"));

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
        `## ${sec.title} (${t("target")}: ${sec.target})`,
        ...sec.questions.map((q, i) => `\nQ${i + 1}. ${q.question}\n   ${t("purpose")}: ${q.purpose}\n   ${t("followUp")}: ${q.followUp}`),
      ].join("\n")),
      guidelines ? `\n## ${t("interviewGuidelines")}\n${guidelines}` : "",
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
                    <p className="text-xs text-muted-foreground">{t("purpose")}: {q.purpose}</p>
                    {q.followUp && (
                      <p className="text-xs text-muted-foreground">{t("followUp")}: {q.followUp}</p>
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
                {t("interviewGuidelines")}
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
    if (s.loading) return renderLoading(t("analyzingReport"));
    if (s.error) return renderError(s.error);
    if (!s.result) return renderGenerateButton("investigation_report", t("generateReport"));

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
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="deidentification">
          <TabsList className="w-full">
            <TabsTrigger value="deidentification" className="flex-1 text-xs sm:text-sm">
              <ShieldCheck className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
              {t("deidentification")}
            </TabsTrigger>
            <TabsTrigger value="summary" className="flex-1 text-xs sm:text-sm">
              <ClipboardCheck className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
              {t("summary")}
            </TabsTrigger>
            <TabsTrigger value="violation" className="flex-1 text-xs sm:text-sm">
              <AlertTriangle className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
              {t("violation")}
            </TabsTrigger>
            <TabsTrigger value="investigation_plan" className="flex-1 text-xs sm:text-sm">
              {t("investigationPlan")}
            </TabsTrigger>
            <TabsTrigger value="questionnaire" className="flex-1 text-xs sm:text-sm">
              {t("questionnaire")}
            </TabsTrigger>
            <TabsTrigger value="investigation_report" className="flex-1 text-xs sm:text-sm">
              {t("investigationReport")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="deidentification" className="mt-4">
            {renderDeidentification()}
          </TabsContent>
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

      {/* Prompt Editor Dialog */}
      <Dialog open={promptDialogOpen} onOpenChange={setPromptDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {t("editPromptTitle")} - {editingPromptType ? PROMPT_TYPE_LABELS[editingPromptType] : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                {t("editPromptDesc")}
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                {t("editPromptPlaceholders")}
              </p>
            </div>
            <Textarea
              value={editingPromptText}
              onChange={(e) => setEditingPromptText(e.target.value)}
              rows={16}
              className="font-mono text-xs"
              placeholder={t("editPromptPlaceholderText")}
            />
            {customPrompts[editingPromptType || ""] && (
              <p className="text-xs text-blue-600 dark:text-blue-400">
                {t("customPromptActive")}
              </p>
            )}
          </div>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={resetPromptToDefault}
              disabled={savingPrompt || !customPrompts[editingPromptType || ""]}
              className="text-destructive hover:text-destructive"
            >
              <RotateCw className="h-3.5 w-3.5 mr-1" />
              {t("resetToDefault")}
            </Button>
            <Button
              onClick={saveCustomPrompt}
              disabled={savingPrompt || !editingPromptText.trim()}
            >
              {savingPrompt ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5 mr-1" />
              )}
              {t("savePrompt")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
