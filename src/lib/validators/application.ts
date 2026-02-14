import { z } from "zod";

export const applicationSchema = z.object({
  // Step 0: Company Info + Admin Info
  companyName: z.string().min(1, "회사명을 입력해주세요"),
  businessNumber: z.string().optional(),
  industry: z.string().optional(),
  employeeCount: z.number().int().positive().optional(),
  address: z.string().optional(),
  addressDetail: z.string().optional(),
  department: z.string().optional(),
  adminName: z.string().min(1, "담당자 이름을 입력해주세요"),
  adminEmail: z.string().email("유효한 이메일을 입력해주세요"),
  adminPhone: z.string().optional(),
  adminUsername: z.string().min(1, "로그인 ID를 입력해주세요").email("이메일 형식으로 입력해주세요"),
  adminPassword: z
    .string()
    .min(8, "비밀번호는 최소 8자리입니다")
    .regex(/[A-Z]/, "대문자를 포함해야 합니다")
    .regex(/[a-z]/, "소문자를 포함해야 합니다")
    .regex(/[0-9]/, "숫자를 포함해야 합니다")
    .regex(/[^A-Za-z0-9]/, "특수문자를 포함해야 합니다"),
  adminPasswordConfirm: z.string().min(1, "비밀번호 확인을 입력해주세요"),

  // Step 1: Channel Settings
  channelName: z.string().optional(),
  reportTypes: z.array(z.string()).min(1, "최소 1개의 제보 유형을 선택해주세요"),
  welcomeMessage: z.string().optional(),
  reportGuideMessage: z.string().optional(),
  contentBlocks: z.array(z.object({ id: z.string(), content: z.string(), order: z.number() })).optional(),
  displayFields: z.array(z.string()).optional(),
  preferredLocale: z.enum(["ko", "en", "ja", "zh"]),
  useAiValidation: z.boolean(),
  useChatbot: z.boolean(),

  // Step 3: Agreements
  agreedTerms: z.boolean().refine((v) => v === true, { message: "이용약관에 동의해주세요" }),
  agreedPrivacy: z.boolean().refine((v) => v === true, { message: "개인정보 처리방침에 동의해주세요" }),
}).refine((data) => data.adminPassword === data.adminPasswordConfirm, {
  message: "비밀번호가 일치하지 않습니다",
  path: ["adminPasswordConfirm"],
});

export type ApplicationInput = z.infer<typeof applicationSchema>;
