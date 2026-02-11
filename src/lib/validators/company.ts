import { z } from "zod";

export const companyCreateSchema = z.object({
  groupId: z.string().uuid().optional(),
  name: z.string().min(1, "기업명을 입력해주세요"),
  nameEn: z.string().optional(),
  businessNumber: z.string().optional(),
  representativeName: z.string().optional(),
  industry: z.string().optional(),
  employeeCount: z.number().int().positive().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional().or(z.literal("")),
  description: z.string().optional(),
  welcomeMessage: z.string().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#1a1a2e"),
  useAiValidation: z.boolean().default(false),
  useChatbot: z.boolean().default(false),
  preferredLocale: z.enum(["ko", "en", "ja", "zh"]).default("ko"),
  serviceStart: z.string().optional(),
  serviceEnd: z.string().optional(),
});

export const companyUpdateSchema = companyCreateSchema.partial();

export const companyGroupSchema = z.object({
  name: z.string().min(1, "그룹명을 입력해주세요"),
  description: z.string().optional(),
});

export type CompanyCreateInput = z.infer<typeof companyCreateSchema>;
export type CompanyUpdateInput = z.infer<typeof companyUpdateSchema>;
export type CompanyGroupInput = z.infer<typeof companyGroupSchema>;
