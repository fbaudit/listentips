"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Upload, Brain, CheckCircle, AlertTriangle, Copy, Sparkles } from "lucide-react";
import { reportSubmitSchema, type ReportSubmitInput, ALLOWED_FILE_TYPES, MAX_FILE_SIZE, MAX_TOTAL_SIZE } from "@/lib/validators/report";

interface ReportType {
  id: string;
  type_name: string;
  type_name_en: string | null;
  description: string | null;
}

interface AIValidation {
  score: number;
  missingElements: string[];
  suggestions: string[];
  extracted: {
    who: string;
    what: string;
    when: string;
    where: string;
    why: string;
    how: string;
  };
}

export default function ReportSubmitPage() {
  const t = useTranslations("report.submit");
  const ts = useTranslations("report.success");
  const tai = useTranslations("report.ai");
  const params = useParams();
  const companyCode = params.companyCode as string;

  const [reportTypes, setReportTypes] = useState<ReportType[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [aiValidation, setAiValidation] = useState<AIValidation | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reportNumber, setReportNumber] = useState("");
  const [error, setError] = useState("");
  const [reportGuideMessage, setReportGuideMessage] = useState("");
  const [minPasswordLength, setMinPasswordLength] = useState(8);
  const [requireSpecialChars, setRequireSpecialChars] = useState(false);
  const [aiEnhanceLoading, setAiEnhanceLoading] = useState(false);
  const [showEnhanceDialog, setShowEnhanceDialog] = useState(false);
  const [enhancedContent, setEnhancedContent] = useState("");

  const form = useForm<ReportSubmitInput>({
    resolver: zodResolver(reportSubmitSchema),
    defaultValues: {
      companyId: "",
      reportTypeId: "",
      title: "",
      content: "",
      password: "",
      passwordConfirm: "",
    },
  });

  // Load report types on mount
  useState(() => {
    fetch(`/api/companies/${companyCode}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.company) {
          form.setValue("companyId", data.company.id);
          setReportTypes(data.reportTypes || []);
          if (data.company.report_guide_message) {
            setReportGuideMessage(data.company.report_guide_message);
          }
          if (data.company.min_password_length) {
            setMinPasswordLength(data.company.min_password_length);
          }
          if (data.company.require_special_chars) {
            setRequireSpecialChars(true);
          }
        }
      })
      .catch(() => {});
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newFiles = Array.from(e.target.files || []);
    const validFiles = newFiles.filter((f) => {
      if (!ALLOWED_FILE_TYPES.includes(f.type)) return false;
      if (f.size > MAX_FILE_SIZE) return false;
      return true;
    });

    const totalSize = [...files, ...validFiles].reduce((s, f) => s + f.size, 0);
    if (totalSize > MAX_TOTAL_SIZE) {
      setError("총 파일 크기는 50MB를 초과할 수 없습니다");
      return;
    }

    setFiles([...files, ...validFiles]);
    // Reset native input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(index: number) {
    setFiles(files.filter((_, i) => i !== index));
  }

  async function handleAiValidate() {
    const content = form.getValues("content");
    const title = form.getValues("title");
    if (!content || content.length < 20) {
      setError("AI 검증을 위해 최소 20자 이상의 내용을 입력해주세요");
      return;
    }

    setAiLoading(true);
    setShowAiDialog(true);
    try {
      const res = await fetch("/api/ai/validate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, title, companyCode }),
      });
      const data = await res.json();
      setAiValidation(data);
    } catch {
      setError("AI 검증 중 오류가 발생했습니다");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleAiEnhance() {
    const content = form.getValues("content");
    const title = form.getValues("title");
    const reportTypeId = form.getValues("reportTypeId");

    if (!reportTypeId) {
      setError("제보 유형을 선택해주세요");
      return;
    }

    if (!content || content.length < 20) {
      setError("AI 업데이트를 위해 최소 20자 이상의 내용을 입력해주세요");
      return;
    }

    const selectedType = reportTypes.find((t) => t.id === reportTypeId);
    const reportType = selectedType?.type_name || "";

    setAiEnhanceLoading(true);
    setShowEnhanceDialog(true);
    try {
      const res = await fetch("/api/ai/enhance-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, title, companyCode, reportType }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setShowEnhanceDialog(false);
      } else {
        setEnhancedContent(data.enhancedContent);
      }
    } catch {
      setError("AI 내용 보강 중 오류가 발생했습니다");
      setShowEnhanceDialog(false);
    } finally {
      setAiEnhanceLoading(false);
    }
  }

  function handleApplyEnhanced() {
    form.setValue("content", enhancedContent, { shouldValidate: true });
    setShowEnhanceDialog(false);
  }

  async function onSubmit(data: ReportSubmitInput) {
    setLoading(true);
    setError("");

    try {
      // Create form data for file upload
      const formData = new FormData();
      formData.append("companyId", data.companyId);
      formData.append("reportTypeId", data.reportTypeId);
      formData.append("title", data.title);
      formData.append("content", data.content);
      formData.append("password", data.password);

      if (aiValidation) {
        formData.append("aiValidationScore", String(aiValidation.score));
        formData.append("aiValidationFeedback", JSON.stringify(aiValidation));
      }

      files.forEach((file) => {
        formData.append("files", file);
      });

      const res = await fetch("/api/reports", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "제보 접수 중 오류가 발생했습니다");
        return;
      }

      setReportNumber(result.reportNumber);
      setSubmitted(true);
    } catch {
      setError("제보 접수 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  }

  // Success Screen
  if (submitted) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-8 text-center space-y-4">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <h2 className="text-2xl font-bold">{ts("title")}</h2>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">{ts("reportNumber")}</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-3xl font-mono font-bold tracking-wider">{reportNumber}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigator.clipboard.writeText(reportNumber)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>{ts("warning")}</strong>
              <br />
              {ts("warningDetail")}
            </AlertDescription>
          </Alert>
          <Button
            variant="outline"
            onClick={() => window.location.href = `/report/${companyCode}`}
            className="w-full"
          >
            {ts("goBack")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Report Type */}
        <div className="space-y-2">
          <Label>{t("reportType")} *</Label>
          <Select onValueChange={(v) => form.setValue("reportTypeId", v)}>
            <SelectTrigger>
              <SelectValue placeholder={t("reportType")} />
            </SelectTrigger>
            <SelectContent>
              {reportTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.type_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(() => {
            const selectedType = reportTypes.find((t) => t.id === form.watch("reportTypeId"));
            return selectedType?.description ? (
              <div
                className="text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2 prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                dangerouslySetInnerHTML={{ __html: selectedType.description }}
              />
            ) : null;
          })()}
          {form.formState.errors.reportTypeId && (
            <p className="text-sm text-destructive">{form.formState.errors.reportTypeId.message}</p>
          )}
        </div>

        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">{t("reportTitle")} *</Label>
          <Input id="title" {...form.register("title")} placeholder="제보 제목을 입력하세요" maxLength={40} />
          {form.formState.errors.title && (
            <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
          )}
        </div>

        {/* Content */}
        <div className="space-y-2">
          <Label htmlFor="content">{t("reportContent")} *</Label>
          <Textarea
            id="content"
            {...form.register("content")}
            placeholder={reportGuideMessage || "제보 내용을 상세히 작성해주세요. 누가, 무엇을, 언제, 어디서, 왜, 어떻게 했는지 포함해주세요."}
            rows={10}
            className="min-h-[240px]"
          />
          {form.formState.errors.content && (
            <p className="text-sm text-destructive">{form.formState.errors.content.message}</p>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleAiValidate}>
              <Brain className="h-4 w-4 mr-2" />
              {t("aiValidate")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleAiEnhance} disabled={aiEnhanceLoading}>
              {aiEnhanceLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              AI 제보내용 업데이트
            </Button>
          </div>
        </div>

        {/* File Upload */}
        <div className="space-y-2">
          <Label>{t("attachments")}</Label>
          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">클릭하여 파일을 선택하세요</p>
            <p className="text-xs text-muted-foreground">{t("attachmentHelp")}</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.txt,.doc,.docx,.xls,.xlsx"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          {files.length > 0 && (
            <div className="space-y-1">
              {files.map((file, i) => (
                <div key={i} className="flex items-center justify-between bg-muted rounded px-3 py-1.5 text-sm">
                  <span className="truncate">{file.name} ({(file.size / 1024 / 1024).toFixed(1)}MB)</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeFile(i)}>×</Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Password */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="password">{t("password")} *</Label>
            <Input id="password" type="password" {...form.register("password")} />
            <p className="text-xs text-muted-foreground">
              {t("passwordHelp")} (최소 {minPasswordLength}자{requireSpecialChars ? ", 특수문자 포함 필수" : ""})
            </p>
            {form.formState.errors.password && (
              <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="passwordConfirm">{t("passwordConfirm")} *</Label>
            <Input id="passwordConfirm" type="password" {...form.register("passwordConfirm")} />
            {form.formState.errors.passwordConfirm && (
              <p className="text-sm text-destructive">{form.formState.errors.passwordConfirm.message}</p>
            )}
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {loading ? t("submitting") : t("submitReport")}
        </Button>
      </form>

      {/* AI Validation Dialog */}
      <Dialog open={showAiDialog} onOpenChange={setShowAiDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{tai("validationResult")}</DialogTitle>
          </DialogHeader>
          {aiLoading ? (
            <div className="flex flex-col items-center py-8 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{t("aiValidating")}</p>
            </div>
          ) : aiValidation ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">{tai("score")}</p>
                <div className="flex items-center gap-3">
                  <Progress value={aiValidation.score * 100} className="flex-1" />
                  <span className="text-lg font-bold">{Math.round(aiValidation.score * 100)}%</span>
                </div>
              </div>

              {aiValidation.missingElements.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">{tai("missingElements")}</p>
                  <div className="flex flex-wrap gap-1">
                    {aiValidation.missingElements.map((el, i) => (
                      <Badge key={i} variant="destructive">{el}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {aiValidation.suggestions.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">{tai("suggestions")}</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {aiValidation.suggestions.map((s, i) => (
                      <li key={i}>• {s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* AI Enhance Dialog */}
      <Dialog open={showEnhanceDialog} onOpenChange={setShowEnhanceDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI 제보내용 업데이트</DialogTitle>
          </DialogHeader>
          {aiEnhanceLoading ? (
            <div className="flex flex-col items-center py-8 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">AI가 제보 내용을 보강하고 있습니다...</p>
            </div>
          ) : enhancedContent ? (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4 whitespace-pre-wrap text-sm break-words">
                {enhancedContent}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEnhanceDialog(false)}>
                  취소
                </Button>
                <Button onClick={handleApplyEnhanced}>
                  적용
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
