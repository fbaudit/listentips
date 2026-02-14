"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { applicationSchema, type ApplicationInput } from "@/lib/validators/application";
import { PLANS } from "@/lib/constants/plans";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, Settings, CreditCard, FileCheck, CheckCircle2, ArrowLeft, ArrowRight, Loader2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/routing";

const STEPS = [
  { icon: Building2, label: "기업 정보" },
  { icon: Settings, label: "채널 설정" },
  { icon: CreditCard, label: "요금제 선택" },
  { icon: FileCheck, label: "약관 동의" },
  { icon: CheckCircle2, label: "확인 및 제출" },
];

interface DefaultReportType {
  id: string;
  type_name: string;
  type_name_en: string | null;
  type_name_ja: string | null;
  type_name_zh: string | null;
}

interface DefaultReportStatus {
  id: string;
  status_name: string;
  color_code: string;
  display_order: number;
  is_default: boolean;
  is_terminal: boolean;
}

interface DefaultContentBlock {
  id: string;
  content: string;
  display_order: number;
}

const FIELD_LABELS: Record<string, string> = {
  companyName: "회사명",
  businessNumber: "사업자번호",
  industry: "업종",
  employeeCount: "직원 수",
  address: "주소",
  department: "담당부서",
  adminName: "담당자 이름",
  adminEmail: "이메일",
  adminPhone: "전화번호",
  adminUsername: "로그인 ID",
  adminPassword: "비밀번호",
  adminPasswordConfirm: "비밀번호 확인",
  channelName: "채널 이름",
  reportTypes: "제보 유형",
  welcomeMessage: "안내 메시지",
  reportGuideMessage: "제보내용 안내문구",
  contentBlocks: "안내 블록",
  preferredLocale: "선호 언어",
  useAiValidation: "AI 검증",
  useChatbot: "AI 챗봇",
  agreedTerms: "이용약관 동의",
  agreedPrivacy: "개인정보처리방침 동의",
};

const INDUSTRY_OPTIONS = [
  "제조업", "IT/소프트웨어", "금융/보험", "의료/제약",
  "건설", "유통/물류", "교육", "공공기관", "기타",
];

export default function ApplyPage() {
  const t = useTranslations("apply");
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<string>("free_trial");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [usernameChecked, setUsernameChecked] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(false);
  const [usernameCheckMsg, setUsernameCheckMsg] = useState("");
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [stepValidated, setStepValidated] = useState<Record<number, boolean>>({});
  const [defaultReportTypes, setDefaultReportTypes] = useState<DefaultReportType[]>([]);
  const [defaultStatuses, setDefaultStatuses] = useState<DefaultReportStatus[]>([]);
  const [allContentBlocks, setAllContentBlocks] = useState<DefaultContentBlock[]>([]);
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set());

  const form = useForm<ApplicationInput>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      companyName: "",
      businessNumber: "",
      industry: "",
      employeeCount: undefined,
      address: "",
      addressDetail: "",
      department: "",
      adminName: "",
      adminEmail: "",
      adminPhone: "",
      adminUsername: "",
      adminPassword: "",
      adminPasswordConfirm: "",
      channelName: "",
      reportTypes: [],
      welcomeMessage: "",
      reportGuideMessage: "",
      contentBlocks: [],
      preferredLocale: "ko",
      useAiValidation: false,
      useChatbot: false,
      agreedTerms: false,
      agreedPrivacy: false,
    },
  });

  const { register, watch, setValue, formState: { errors }, trigger } = form;

  useEffect(() => {
    fetch("/api/public/default-report-types")
      .then((res) => res.json())
      .then((data) => setDefaultReportTypes(data.reportTypes || []))
      .catch(() => {});

    fetch("/api/public/default-report-statuses")
      .then((res) => res.json())
      .then((data) => setDefaultStatuses(data.statuses || []))
      .catch(() => {});

    fetch("/api/public/default-content-blocks")
      .then((res) => res.json())
      .then((data) => {
        const blocks: DefaultContentBlock[] = data.blocks || [];
        setAllContentBlocks(blocks);
        // Select all by default
        const allIds = new Set(blocks.map((b: DefaultContentBlock) => b.id));
        setSelectedBlockIds(allIds);
        // Sync to form
        const formBlocks = blocks.map((b: DefaultContentBlock) => ({
          id: b.id,
          content: b.content,
          order: b.display_order,
        }));
        if (formBlocks.length > 0) {
          setValue("contentBlocks", formBlocks);
        }
      })
      .catch(() => {});
  }, [setValue]);

  const watchedReportTypes = watch("reportTypes");
  const watchedPassword = watch("adminPassword");
  const watchedPasswordConfirm = watch("adminPasswordConfirm");
  const passwordRules = [
    { test: (v: string) => v.length >= 8, label: "8자 이상" },
    { test: (v: string) => /[A-Z]/.test(v), label: "대문자 포함" },
    { test: (v: string) => /[a-z]/.test(v), label: "소문자 포함" },
    { test: (v: string) => /[0-9]/.test(v), label: "숫자 포함" },
    { test: (v: string) => /[^A-Za-z0-9]/.test(v), label: "특수문자 포함" },
  ];
  const allPasswordRulesPassed = watchedPassword ? passwordRules.every((r) => r.test(watchedPassword)) : false;
  const passwordsMatch = watchedPassword && watchedPasswordConfirm ? watchedPassword === watchedPasswordConfirm : false;

  const toggleReportType = (type: string) => {
    const current = watchedReportTypes || [];
    let updated: string[];
    if (current.includes(type)) {
      updated = current.filter((t) => t !== type);
    } else {
      updated = [...current, type];
    }
    setValue("reportTypes", updated);
    if (updated.length > 0) {
      form.clearErrors("reportTypes");
    }
  };

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "DAUM_POSTCODE_RESULT") {
        setValue("address", `(${e.data.zonecode}) ${e.data.roadAddress}`);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [setValue]);

  const openAddressSearch = () => {
    const width = 500;
    const height = 600;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    window.open("/postcode.html", "postcodePopup", `width=${width},height=${height},left=${left},top=${top}`);
  };

  const checkUsername = async () => {
    const username = watch("adminUsername");
    if (!username || username.length < 4) {
      setUsernameCheckMsg("아이디는 최소 4자리입니다");
      setUsernameAvailable(false);
      setUsernameChecked(true);
      return;
    }
    setIsCheckingUsername(true);
    try {
      const res = await fetch("/api/check-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      setUsernameAvailable(data.available);
      setUsernameCheckMsg(data.message);
      setUsernameChecked(true);
      if (data.available) {
        form.clearErrors("adminUsername");
      }
    } catch {
      setUsernameCheckMsg("확인 중 오류가 발생했습니다");
      setUsernameAvailable(false);
      setUsernameChecked(true);
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const toggleContentBlock = (blockId: string) => {
    const newSelected = new Set(selectedBlockIds);
    if (newSelected.has(blockId)) {
      newSelected.delete(blockId);
    } else {
      newSelected.add(blockId);
    }
    setSelectedBlockIds(newSelected);
    // Sync selected blocks to form
    const formBlocks = allContentBlocks
      .filter((b) => newSelected.has(b.id))
      .map((b) => ({ id: b.id, content: b.content, order: b.display_order }));
    setValue("contentBlocks", formBlocks);
  };

  const validateCurrentStep = async () => {
    setStepValidated((prev) => ({ ...prev, [currentStep]: true }));
    const fieldsMap: Record<number, (keyof ApplicationInput)[]> = {
      0: ["companyName", "adminName", "adminEmail", "adminUsername", "adminPassword", "adminPasswordConfirm"],
      1: ["reportTypes"],
      2: [],
      3: ["agreedTerms", "agreedPrivacy"],
    };
    const fields = fieldsMap[currentStep];
    if (!fields || fields.length === 0) return true;
    const valid = await trigger(fields);
    if (currentStep === 0 && valid && (!usernameChecked || !usernameAvailable)) {
      form.setError("adminUsername", { message: "아이디 중복확인을 해주세요" });
      return false;
    }
    return valid;
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (isValid) {
      // Auto-fill channel name if empty when moving to channel settings
      if (currentStep === 0) {
        const channelName = watch("channelName");
        const companyName = watch("companyName");
        if (!channelName && companyName) {
          setValue("channelName", `${companyName} 제보채널`);
        }
      }
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    // Clean NaN from number fields before validation
    const ec = form.getValues("employeeCount");
    if (ec === undefined || (typeof ec === "number" && Number.isNaN(ec))) {
      form.setValue("employeeCount", undefined);
    }

    const isValid = await form.trigger();
    if (!isValid) {
      return;
    }

    setIsSubmitting(true);
    try {
      const values = form.getValues();
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (!res.ok) {
        form.setError("companyName", { message: data.error || "제출 중 오류가 발생했습니다" });
        return;
      }

      setApplicationId(data.applicationId);
      setIsSubmitted(true);
    } catch {
      form.setError("companyName", { message: "네트워크 오류가 발생했습니다" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="container max-w-2xl mx-auto py-16 px-4">
        <Card>
          <CardContent className="pt-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold">{t("submitted.title")}</h2>
            <p className="text-muted-foreground">{t("submitted.description")}</p>
            {applicationId && (
              <p className="text-sm text-muted-foreground">
                {t("submitted.applicationId")}: <span className="font-mono font-bold">{applicationId.slice(0, 8)}</span>
              </p>
            )}
            <Button asChild className="mt-4">
              <Link href="/">{t("submitted.backHome")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-2">{t("description")}</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center mb-8 gap-1">
        {STEPS.map((step, index) => (
          <div key={index} className="flex items-center">
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-full text-sm transition-colors",
                index === currentStep
                  ? "bg-primary text-primary-foreground"
                  : index < currentStep
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
              )}
            >
              <step.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{step.label}</span>
              <span className="sm:hidden">{index + 1}</span>
            </div>
            {index < STEPS.length - 1 && (
              <div className={cn("w-8 h-0.5 mx-1", index < currentStep ? "bg-primary" : "bg-muted")} />
            )}
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          {/* Step 0: Company Info + Admin Info */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <CardHeader className="p-0">
                <CardTitle>{t("step1.title")}</CardTitle>
                <CardDescription>{t("step1.description")}</CardDescription>
              </CardHeader>

              {/* Company Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="companyName">{t("step1.companyName")} *</Label>
                  <Input
                    id="companyName"
                    className="bg-red-50"
                    {...register("companyName", {
                      onChange: (e) => {
                        if (e.target.value.length > 0) form.clearErrors("companyName");
                      },
                    })}
                    placeholder="주식회사 예시"
                  />
                  {errors.companyName && <p className="text-sm text-destructive">{errors.companyName.message}</p>}
                  {stepValidated[0] && !errors.companyName && watch("companyName")?.length > 0 && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <Check className="w-3 h-3" /> 회사명이 입력되었습니다
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessNumber">{t("step1.businessNumber")}</Label>
                  <Input id="businessNumber" {...register("businessNumber")} placeholder="000-00-00000" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">{t("step1.industry")}</Label>
                  <Select onValueChange={(v) => setValue("industry", v)} value={watch("industry")}>
                    <SelectTrigger><SelectValue placeholder="업종 선택" /></SelectTrigger>
                    <SelectContent>
                      {INDUSTRY_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employeeCount">{t("step1.employeeCount")}</Label>
                  <Input
                    id="employeeCount"
                    type="number"
                    {...register("employeeCount", { setValueAs: (v: string) => { if (v === "" || v === undefined) return undefined; const n = Number(v); return Number.isNaN(n) ? undefined : n; } })}
                    placeholder="100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">{t("step1.department")}</Label>
                  <Input id="department" {...register("department")} placeholder="준법감시팀" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">{t("step1.address")}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="address"
                      {...register("address")}
                      placeholder="주소 검색 버튼을 클릭하세요"
                      readOnly
                      className="flex-1 bg-muted cursor-pointer"
                      onClick={openAddressSearch}
                    />
                    <Button type="button" variant="outline" onClick={openAddressSearch}>
                      주소 검색
                    </Button>
                  </div>
                </div>
                {watch("address") && (
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="addressDetail">상세주소</Label>
                    <Input
                      id="addressDetail"
                      {...register("addressDetail")}
                      placeholder="동/호수 등 상세주소 입력"
                    />
                  </div>
                )}
              </div>

              {/* Admin Info - merged */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">담당자 정보</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="adminUsername">{t("step2.username")} (이메일) *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="adminUsername"
                        type="email"
                        {...register("adminUsername", {
                          onChange: () => {
                            setUsernameChecked(false);
                            setUsernameAvailable(false);
                            setUsernameCheckMsg("");
                          },
                        })}
                        placeholder="user@example.com"
                        className="flex-1 bg-red-50"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={checkUsername}
                        disabled={isCheckingUsername}
                      >
                        {isCheckingUsername ? <Loader2 className="w-4 h-4 animate-spin" /> : "중복확인"}
                      </Button>
                    </div>
                    {errors.adminUsername && <p className="text-sm text-destructive">{errors.adminUsername.message}</p>}
                    {usernameChecked && !errors.adminUsername && (
                      <p className={cn("text-sm flex items-center gap-1", usernameAvailable ? "text-green-600" : "text-destructive")}>
                        {usernameAvailable ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        {usernameCheckMsg}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminName">{t("step2.name")} *</Label>
                    <Input id="adminName" className="bg-red-50" {...register("adminName")} placeholder="홍길동" />
                    {errors.adminName && <p className="text-sm text-destructive">{errors.adminName.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="adminEmail">{t("step2.email")} (비밀번호 찾기, 2차 인증) *</Label>
                      <div className="flex items-center gap-1.5">
                        <Checkbox
                          id="admin_email_same"
                          checked={watch("adminEmail") === watch("adminUsername") && watch("adminUsername") !== ""}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setValue("adminEmail", watch("adminUsername"));
                            }
                          }}
                        />
                        <Label htmlFor="admin_email_same" className="text-xs text-muted-foreground cursor-pointer">
                          로그인 ID(이메일)와 동일
                        </Label>
                      </div>
                    </div>
                    <Input id="adminEmail" type="email" className="bg-red-50" {...register("adminEmail")} placeholder="admin@example.com" />
                    {errors.adminEmail && <p className="text-sm text-destructive">{errors.adminEmail.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminPhone">{t("step2.phone")}</Label>
                    <Input id="adminPhone" {...register("adminPhone")} placeholder="010-1234-5678" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="adminPassword">{t("step2.password")} *</Label>
                    <Input id="adminPassword" type="password" className="bg-red-50" {...register("adminPassword")} placeholder="대/소문자, 숫자, 특수문자 포함 8자 이상" />
                    {watchedPassword ? (
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {passwordRules.map((rule) => {
                          const passed = rule.test(watchedPassword);
                          return (
                            <span key={rule.label} className={cn("text-xs flex items-center gap-1", passed ? "text-green-600" : "text-muted-foreground")}>
                              {passed ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              {rule.label}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">대문자, 소문자, 숫자, 특수문자를 포함하여 8자 이상</p>
                    )}
                    {allPasswordRulesPassed && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <Check className="w-3 h-3" /> 모든 조건을 만족합니다
                      </p>
                    )}
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="adminPasswordConfirm">비밀번호 확인 *</Label>
                    <Input id="adminPasswordConfirm" type="password" className="bg-red-50" {...register("adminPasswordConfirm")} placeholder="비밀번호를 다시 입력하세요" />
                    {watchedPasswordConfirm && (
                      <p className={cn("text-xs flex items-center gap-1", passwordsMatch ? "text-green-600" : "text-destructive")}>
                        {passwordsMatch ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        {passwordsMatch ? "비밀번호가 일치합니다" : "비밀번호가 일치하지 않습니다"}
                      </p>
                    )}
                    {errors.adminPasswordConfirm && !watchedPasswordConfirm && <p className="text-sm text-destructive">{errors.adminPasswordConfirm.message}</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Channel Settings */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <CardHeader className="p-0">
                <CardTitle>채널 설정</CardTitle>
                <CardDescription>
                  제보 채널의 기본 설정을 구성합니다.{" "}
                  <span className="text-red-500">
                    추후 제보채널 이름, 안내 메시지, 제보내용 작성 안내문구, 채널 메인 안내 블록, AI 기능, 제보유형, 기본제보 상태 모두 수정 가능합니다.
                  </span>
                </CardDescription>
              </CardHeader>

              <div className="space-y-2">
                <Label htmlFor="channelName">제보 채널 이름</Label>
                <Input
                  id="channelName"
                  {...register("channelName")}
                  placeholder={`${watch("companyName") || "기업명"} 제보채널`}
                />
                <p className="text-xs text-muted-foreground">제보자에게 표시되는 채널 이름입니다</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="welcomeMessage">안내 메시지</Label>
                <Textarea
                  id="welcomeMessage"
                  {...register("welcomeMessage")}
                  placeholder="제보자에게 보여줄 안내 메시지를 입력하세요..."
                  rows={3}
                />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">예시를 클릭하면 자동으로 입력됩니다</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "당신의 용기는 기록되지 않고, 사실만 남습니다",
                      "혼자 고민하지 않아도 됩니다. 제보는 보호받아야 할 권리입니다",
                      "작은 의심 하나가 조직을 바꾸는 시작이 될 수 있습니다",
                      "말하지 않으면 바뀌지 않습니다. 말해도 당신은 드러나지 않습니다",
                      "사실을 아는 사람이 가장 먼저 보호받아야 합니다",
                    ].map((msg) => (
                      <button
                        key={msg}
                        type="button"
                        onClick={() => setValue("welcomeMessage", msg)}
                        className="text-xs text-left px-2 py-1 rounded-md border border-muted bg-muted/30 hover:bg-primary/10 hover:border-primary/30 transition-colors cursor-pointer"
                      >
                        {msg}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reportGuideMessage">제보내용 작성 안내문구</Label>
                <Textarea
                  id="reportGuideMessage"
                  {...register("reportGuideMessage")}
                  placeholder="제보 내용 입력란에 표시되는 안내문구를 입력하세요..."
                  rows={5}
                />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">예시를 클릭하면 안내문구에 추가됩니다</p>
                  <div className="flex flex-col gap-1">
                    {[
                      "단순 민원성 제보나 근거 없이 타인을 비방하거나 음해하는 내용의 제보는 처리되지 않을 수도 있습니다.",
                      "사실에 근거해 육하원칙에 따라 구체적으로 작성해주시기 바랍니다.",
                      "피제보자의 실명을 기재해주시면 보다 정확한 파악이 가능합니다.",
                      "익명 제보 시 답변은 처리확인에서 수시 확인해주시기 바랍니다.",
                      "명백한 사안 시 제보처리 진행과정을 이메일 또는 문자로 안내 받을 수 있습니다.",
                    ].map((msg, idx) => (
                      <button
                        key={msg}
                        type="button"
                        onClick={() => {
                          const current = watch("reportGuideMessage") || "";
                          if (current.includes(msg)) return;
                          setValue("reportGuideMessage", current ? `${current}\n${msg}` : msg);
                        }}
                        className="text-xs text-left px-2 py-1 rounded-md border border-muted bg-muted/30 hover:bg-primary/10 hover:border-primary/30 transition-colors cursor-pointer"
                      >
                        {msg}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Content Blocks */}
              <div className="space-y-2">
                <Label>채널 메인 안내 블록</Label>
                <p className="text-xs text-muted-foreground">제보 메인 페이지에 표시되는 안내 블록입니다. 클릭하여 선택/해제할 수 있습니다. 추후 수정이 가능합니다.</p>
                {allContentBlocks.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center border rounded-md">등록된 안내 블록이 없습니다</p>
                )}
                <div className="space-y-2">
                  {[...allContentBlocks]
                    .sort((a, b) => a.display_order - b.display_order)
                    .map((block) => {
                      const isSelected = selectedBlockIds.has(block.id);
                      return (
                        <div
                          key={block.id}
                          onClick={() => toggleContentBlock(block.id)}
                          className={cn(
                            "rounded-lg border p-3 cursor-pointer transition-colors",
                            isSelected
                              ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                              : "border-muted bg-muted/30 opacity-60"
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <div className={cn(
                              "mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors",
                              isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
                            )}>
                              {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                            </div>
                            <div
                              className="prose prose-sm max-w-none flex-1 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                              dangerouslySetInnerHTML={{ __html: block.content }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* AI Features */}
              <div className="space-y-1">
                <Label>AI 기능</Label>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="useAiValidation"
                      checked={watch("useAiValidation")}
                      onCheckedChange={(v) => setValue("useAiValidation", !!v)}
                    />
                    <Label htmlFor="useAiValidation" className="cursor-pointer">AI 제보내용 검증 사용</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="useChatbot"
                      checked={watch("useChatbot")}
                      onCheckedChange={(v) => setValue("useChatbot", !!v)}
                    />
                    <Label htmlFor="useChatbot" className="cursor-pointer">AI 챗봇 사용</Label>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">인터넷이 연결된 환경에서 동작하며, Google Gemini, OpenAI API Key 입력 필요</p>
              </div>

              {/* Report Types */}
              <div className="space-y-2">
                <Label>제보 유형 *</Label>
                <div className="flex flex-wrap gap-2 p-3 rounded-md bg-red-50 border border-red-100">
                  {defaultReportTypes.map((rt) => (
                    <Badge
                      key={rt.id}
                      variant={watchedReportTypes?.includes(rt.type_name) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleReportType(rt.type_name)}
                    >
                      {rt.type_name}
                    </Badge>
                  ))}
                </div>
                {errors.reportTypes && <p className="text-sm text-destructive">{errors.reportTypes.message}</p>}
                {stepValidated[1] && !errors.reportTypes && watchedReportTypes?.length > 0 && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <Check className="w-3 h-3" /> {watchedReportTypes.length}개 유형이 선택되었습니다
                  </p>
                )}
              </div>

              {/* Report Statuses (read-only) */}
              {defaultStatuses.length > 0 && (
                <div className="space-y-2">
                  <Label>기본 제보 상태</Label>
                  <div className="flex flex-wrap gap-2 p-3 rounded-md bg-muted border">
                    {defaultStatuses.map((status) => (
                      <Badge
                        key={status.id}
                        variant="outline"
                        className="cursor-default"
                        style={{ borderColor: status.color_code, color: status.color_code }}
                      >
                        {status.status_name}
                        {status.is_default && <span className="ml-1 text-[10px]">(기본)</span>}
                        {status.is_terminal && <span className="ml-1 text-[10px]">(최종)</span>}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">기업 등록 후 설정에서 변경 가능합니다</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Plan Selection */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <CardHeader className="p-0">
                <CardTitle>{t("step3.title")}</CardTitle>
                <CardDescription>{t("step3.description")}</CardDescription>
              </CardHeader>
              <div className="grid gap-4 sm:grid-cols-3">
                {Object.entries(PLANS).map(([key, plan]) => (
                  <Card
                    key={key}
                    className={cn(
                      "cursor-pointer transition-colors",
                      selectedPlan === key ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/50"
                    )}
                    onClick={() => setSelectedPlan(key)}
                  >
                    <CardHeader className="text-center">
                      <CardTitle className="text-lg">{plan.name.ko}</CardTitle>
                      <div className="text-2xl font-bold">
                        {plan.price.KRW === 0
                          ? "무료"
                          : `₩${plan.price.KRW.toLocaleString()}`}
                      </div>
                      {key !== "free_trial" && (
                        <p className="text-xs text-muted-foreground">
                          {key === "monthly" ? "/ 월" : "/ 년"}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        {plan.features.ko.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <p className="text-sm text-muted-foreground text-center">
                모든 신규 가입은 30일 무료 체험으로 시작됩니다. 결제는 승인 후 별도 안내됩니다.
              </p>
            </div>
          )}

          {/* Step 3: Terms */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <CardHeader className="p-0">
                <CardTitle>{t("step4.title")}</CardTitle>
                <CardDescription>{t("step4.description")}</CardDescription>
              </CardHeader>
              <div className="space-y-4">
                <div className="rounded-lg border border-red-100 bg-red-50 p-4 space-y-2">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="agreedTerms"
                      checked={watch("agreedTerms")}
                      onCheckedChange={(v) => setValue("agreedTerms", !!v)}
                    />
                    <div>
                      <Label htmlFor="agreedTerms" className="cursor-pointer font-medium">
                        {t("step4.termsLabel")} *
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        서비스 이용약관에 동의합니다.{" "}
                        <Link href="/terms" className="text-primary underline" target="_blank">
                          전문 보기
                        </Link>
                      </p>
                    </div>
                  </div>
                  {errors.agreedTerms && <p className="text-sm text-destructive ml-7">{errors.agreedTerms.message}</p>}
                </div>
                <div className="rounded-lg border border-red-100 bg-red-50 p-4 space-y-2">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="agreedPrivacy"
                      checked={watch("agreedPrivacy")}
                      onCheckedChange={(v) => setValue("agreedPrivacy", !!v)}
                    />
                    <div>
                      <Label htmlFor="agreedPrivacy" className="cursor-pointer font-medium">
                        {t("step4.privacyLabel")} *
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        개인정보 처리방침에 동의합니다.{" "}
                        <Link href="/privacy" className="text-primary underline" target="_blank">
                          전문 보기
                        </Link>
                      </p>
                    </div>
                  </div>
                  {errors.agreedPrivacy && <p className="text-sm text-destructive ml-7">{errors.agreedPrivacy.message}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review & Submit */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <CardHeader className="p-0">
                <CardTitle>{t("step5.title")}</CardTitle>
                <CardDescription>{t("step5.description")}</CardDescription>
              </CardHeader>
              <div className="space-y-4">
                {/* Company & Admin Info */}
                <div className="rounded-lg border p-4 space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> 기업 정보 / 담당자
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">회사명:</span> {watch("companyName") || "-"}</div>
                    <div><span className="text-muted-foreground">사업자번호:</span> {watch("businessNumber") || "-"}</div>
                    <div><span className="text-muted-foreground">업종:</span> {watch("industry") || "-"}</div>
                    <div><span className="text-muted-foreground">직원 수:</span> {watch("employeeCount") ? `${watch("employeeCount")}명` : "-"}</div>
                    <div><span className="text-muted-foreground">담당부서:</span> {watch("department") || "-"}</div>
                    <div className="col-span-2"><span className="text-muted-foreground">주소:</span> {watch("address") ? `${watch("address")}${watch("addressDetail") ? ` ${watch("addressDetail")}` : ""}` : "-"}</div>
                  </div>
                  <div className="border-t pt-2 mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">담당자:</span> {watch("adminName") || "-"}</div>
                    <div><span className="text-muted-foreground">로그인 ID:</span> {watch("adminUsername") || "-"}</div>
                    <div><span className="text-muted-foreground">이메일:</span> {watch("adminEmail") || "-"}</div>
                    <div><span className="text-muted-foreground">전화번호:</span> {watch("adminPhone") || "-"}</div>
                  </div>
                </div>

                {/* Channel Settings */}
                <div className="rounded-lg border p-4 space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Settings className="w-4 h-4" /> 채널 설정
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-muted-foreground">채널 이름:</span> {watch("channelName") || "-"}</div>
                    <div><span className="text-muted-foreground">안내 메시지:</span> {watch("welcomeMessage") || "-"}</div>
                    <div><span className="text-muted-foreground">제보내용 안내문구:</span> {watch("reportGuideMessage") || "-"}</div>
                    <div>
                      <span className="text-muted-foreground">채널 메인 안내 블록:</span>
                      {selectedBlockIds.size > 0 ? (
                        <div className="mt-1 space-y-2">
                          {allContentBlocks
                            .filter((b) => selectedBlockIds.has(b.id))
                            .map((block) => (
                              <div
                                key={block.id}
                                className="rounded border p-2 text-xs prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{ __html: block.content }}
                              />
                            ))}
                        </div>
                      ) : (
                        <span> -</span>
                      )}
                    </div>
                    <div>
                      <span className="text-muted-foreground">제보 유형:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {watchedReportTypes?.length > 0
                          ? watchedReportTypes.map((type) => (
                              <Badge key={type} variant="secondary" className="text-xs">{type}</Badge>
                            ))
                          : <span>-</span>}
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <span>
                        <span className="text-muted-foreground">AI 제보내용 검증:</span>{" "}
                        {watch("useAiValidation") ? "사용" : "미사용"}
                      </span>
                      <span>
                        <span className="text-muted-foreground">AI 챗봇:</span>{" "}
                        {watch("useChatbot") ? "사용" : "미사용"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Plan */}
                <div className="rounded-lg border p-4 space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <CreditCard className="w-4 h-4" /> 요금제
                  </h3>
                  <p className="text-sm">
                    {PLANS[selectedPlan as keyof typeof PLANS]?.name.ko} (30일 무료 체험 포함)
                  </p>
                </div>
              </div>
              {Object.keys(errors).length > 0 && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 space-y-1">
                  {Object.entries(errors).map(([field, error]) => (
                    <p key={field} className="text-sm text-destructive">
                      <span className="font-medium">[{FIELD_LABELS[field] || field}]</span> {(error as { message?: string })?.message}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              이전
            </Button>
            {currentStep < STEPS.length - 1 ? (
              <Button type="button" onClick={handleNext}>
                다음
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t("submit")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
