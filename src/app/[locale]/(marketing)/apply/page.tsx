"use client";

import { useState } from "react";
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
import { Building2, User, CreditCard, FileCheck, CheckCircle2, ArrowLeft, ArrowRight, Loader2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/routing";

const STEPS = [
  { icon: Building2, label: "기업 정보" },
  { icon: User, label: "담당자 정보" },
  { icon: CreditCard, label: "요금제 선택" },
  { icon: FileCheck, label: "약관 동의" },
  { icon: CheckCircle2, label: "확인 및 제출" },
];

const REPORT_TYPE_OPTIONS = [
  "횡령/부정", "뇌물/부패", "이해충돌", "직장내 괴롭힘",
  "성희롱/성폭력", "차별", "안전/보건 위반", "환경 위반",
  "개인정보 침해", "회계부정", "기타",
];

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

  const form = useForm<ApplicationInput>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      companyName: "",
      businessNumber: "",
      industry: "",
      employeeCount: undefined,
      address: "",
      department: "",
      reportTypes: [],
      welcomeMessage: "",
      preferredLocale: "ko",
      useAiValidation: false,
      useChatbot: false,
      adminName: "",
      adminEmail: "",
      adminPhone: "",
      adminUsername: "",
      adminPassword: "",
      adminPasswordConfirm: "",
      agreedTerms: false,
      agreedPrivacy: false,
    },
  });

  const { register, watch, setValue, formState: { errors }, trigger } = form;
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

  const validateCurrentStep = async () => {
    setStepValidated((prev) => ({ ...prev, [currentStep]: true }));
    const fieldsMap: Record<number, (keyof ApplicationInput)[]> = {
      0: ["companyName", "reportTypes"],
      1: ["adminName", "adminEmail", "adminUsername", "adminPassword", "adminPasswordConfirm"],
      2: [],
      3: ["agreedTerms", "agreedPrivacy"],
    };
    const fields = fieldsMap[currentStep];
    if (!fields || fields.length === 0) return true;
    const valid = await trigger(fields);
    if (currentStep === 1 && valid && (!usernameChecked || !usernameAvailable)) {
      form.setError("adminUsername", { message: "아이디 중복확인을 해주세요" });
      return false;
    }
    return valid;
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    const isValid = await form.trigger();
    if (!isValid) return;

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
          {/* Step 0: Company Info */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <CardHeader className="p-0">
                <CardTitle>{t("step1.title")}</CardTitle>
                <CardDescription>{t("step1.description")}</CardDescription>
              </CardHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="companyName">{t("step1.companyName")} *</Label>
                  <Input
                    id="companyName"
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
                    {...register("employeeCount", { valueAsNumber: true })}
                    placeholder="100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">{t("step1.department")}</Label>
                  <Input id="department" {...register("department")} placeholder="준법감시팀" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">{t("step1.address")}</Label>
                  <Input id="address" {...register("address")} placeholder="서울특별시 강남구..." />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("step1.reportTypes")} *</Label>
                <div className="flex flex-wrap gap-2">
                  {REPORT_TYPE_OPTIONS.map((type) => (
                    <Badge
                      key={type}
                      variant={watchedReportTypes?.includes(type) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleReportType(type)}
                    >
                      {type}
                    </Badge>
                  ))}
                </div>
                {errors.reportTypes && <p className="text-sm text-destructive">{errors.reportTypes.message}</p>}
                  {stepValidated[0] && !errors.reportTypes && watchedReportTypes?.length > 0 && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <Check className="w-3 h-3" /> {watchedReportTypes.length}개 유형이 선택되었습니다
                    </p>
                  )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="welcomeMessage">{t("step1.welcomeMessage")}</Label>
                <Textarea
                  id="welcomeMessage"
                  {...register("welcomeMessage")}
                  placeholder="제보자에게 보여줄 환영 메시지를 입력하세요..."
                  rows={3}
                />
              </div>

              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="useAiValidation"
                    checked={watch("useAiValidation")}
                    onCheckedChange={(v) => setValue("useAiValidation", !!v)}
                  />
                  <Label htmlFor="useAiValidation" className="cursor-pointer">AI 콘텐츠 검증 사용</Label>
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
            </div>
          )}

          {/* Step 1: Admin Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <CardHeader className="p-0">
                <CardTitle>{t("step2.title")}</CardTitle>
                <CardDescription>{t("step2.description")}</CardDescription>
              </CardHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="adminName">{t("step2.name")} *</Label>
                  <Input id="adminName" {...register("adminName")} placeholder="홍길동" />
                  {errors.adminName && <p className="text-sm text-destructive">{errors.adminName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminEmail">{t("step2.email")} *</Label>
                  <Input id="adminEmail" type="email" {...register("adminEmail")} placeholder="admin@example.com" />
                  {errors.adminEmail && <p className="text-sm text-destructive">{errors.adminEmail.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminPhone">{t("step2.phone")}</Label>
                  <Input id="adminPhone" {...register("adminPhone")} placeholder="010-1234-5678" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="adminUsername">{t("step2.username")} *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="adminUsername"
                      {...register("adminUsername", {
                        onChange: () => {
                          setUsernameChecked(false);
                          setUsernameAvailable(false);
                          setUsernameCheckMsg("");
                        },
                      })}
                      placeholder="admin_user"
                      className="flex-1"
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
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="adminPassword">{t("step2.password")} *</Label>
                  <Input id="adminPassword" type="password" {...register("adminPassword")} placeholder="대/소문자, 숫자, 특수문자 포함 8자 이상" />
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
                  <Input id="adminPasswordConfirm" type="password" {...register("adminPasswordConfirm")} placeholder="비밀번호를 다시 입력하세요" />
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
                <div className="rounded-lg border p-4 space-y-2">
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
                <div className="rounded-lg border p-4 space-y-2">
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
                <div className="rounded-lg border p-4 space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> 기업 정보
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">회사명:</span> {watch("companyName")}</div>
                    {watch("businessNumber") && <div><span className="text-muted-foreground">사업자번호:</span> {watch("businessNumber")}</div>}
                    {watch("industry") && <div><span className="text-muted-foreground">업종:</span> {watch("industry")}</div>}
                    {watch("employeeCount") && <div><span className="text-muted-foreground">직원 수:</span> {watch("employeeCount")}명</div>}
                    {watch("department") && <div><span className="text-muted-foreground">담당부서:</span> {watch("department")}</div>}
                    {watch("address") && <div className="col-span-2"><span className="text-muted-foreground">주소:</span> {watch("address")}</div>}
                  </div>
                  <div className="space-y-2 mt-2">
                    <div className="text-sm">
                      <span className="text-muted-foreground">제보 유형:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {watchedReportTypes?.map((type) => (
                          <Badge key={type} variant="secondary" className="text-xs">{type}</Badge>
                        ))}
                      </div>
                    </div>
                    {watch("welcomeMessage") && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">환영 메시지:</span> {watch("welcomeMessage")}
                      </div>
                    )}
                    <div className="text-sm">
                      <span className="text-muted-foreground">기본 언어:</span>{" "}
                      {{ ko: "한국어", en: "English", ja: "日本語", zh: "中文" }[watch("preferredLocale")] || watch("preferredLocale")}
                    </div>
                    <div className="text-sm flex gap-4">
                      <span>
                        <span className="text-muted-foreground">AI 콘텐츠 검증:</span>{" "}
                        {watch("useAiValidation") ? "사용" : "미사용"}
                      </span>
                      <span>
                        <span className="text-muted-foreground">AI 챗봇:</span>{" "}
                        {watch("useChatbot") ? "사용" : "미사용"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border p-4 space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <User className="w-4 h-4" /> 담당자 정보
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">이름:</span> {watch("adminName")}</div>
                    <div><span className="text-muted-foreground">이메일:</span> {watch("adminEmail")}</div>
                    {watch("adminPhone") && <div><span className="text-muted-foreground">전화번호:</span> {watch("adminPhone")}</div>}
                    <div><span className="text-muted-foreground">아이디:</span> {watch("adminUsername")}</div>
                  </div>
                </div>
                <div className="rounded-lg border p-4 space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <CreditCard className="w-4 h-4" /> 요금제
                  </h3>
                  <p className="text-sm">
                    {PLANS[selectedPlan as keyof typeof PLANS]?.name.ko} (30일 무료 체험 포함)
                  </p>
                </div>
              </div>
              {errors.companyName && (
                <p className="text-sm text-destructive">{errors.companyName.message}</p>
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
