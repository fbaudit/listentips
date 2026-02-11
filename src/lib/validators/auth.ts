import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "아이디를 입력해주세요"),
  password: z.string().min(1, "비밀번호를 입력해주세요"),
  captchaToken: z.string().optional(),
});

export const registerUserSchema = z.object({
  companyId: z.string().uuid(),
  username: z.string().min(4, "아이디는 최소 4자리입니다"),
  password: z
    .string()
    .min(8, "비밀번호는 최소 8자리입니다")
    .regex(/[A-Z]/, "대문자를 포함해야 합니다")
    .regex(/[a-z]/, "소문자를 포함해야 합니다")
    .regex(/[0-9]/, "숫자를 포함해야 합니다")
    .regex(/[^A-Za-z0-9]/, "특수문자를 포함해야 합니다"),
  name: z.string().min(1, "이름을 입력해주세요"),
  email: z.string().email("유효한 이메일을 입력해주세요"),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  country: z.string().default("KR"),
  role: z.enum(["super_admin", "company_admin"]),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterUserInput = z.infer<typeof registerUserSchema>;
