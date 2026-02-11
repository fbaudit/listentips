import { z } from "zod";

export const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB

export const reportSubmitSchema = z.object({
  companyId: z.string().uuid(),
  reportTypeId: z.string().uuid("제보 유형을 선택해주세요"),
  title: z.string().min(5, "제목은 최소 5자 이상 입력해주세요").max(500),
  content: z.string().min(20, "내용은 최소 20자 이상 입력해주세요"),
  password: z
    .string()
    .min(8, "비밀번호는 최소 8자리입니다"),
  passwordConfirm: z.string(),
  captchaToken: z.string().optional(),
}).refine((data) => data.password === data.passwordConfirm, {
  message: "비밀번호가 일치하지 않습니다",
  path: ["passwordConfirm"],
});

export const reportCheckSchema = z.object({
  reportNumber: z.string().length(8, "접수번호는 8자리입니다"),
  password: z.string().min(1, "비밀번호를 입력해주세요"),
});

export const reportUpdateSchema = z.object({
  title: z.string().min(5).max(500).optional(),
  content: z.string().min(20).optional(),
  statusId: z.string().uuid().optional(),
});

export const commentSchema = z.object({
  content: z.string().min(1, "댓글 내용을 입력해주세요"),
  isInternal: z.boolean().default(false),
});

export type ReportSubmitInput = z.infer<typeof reportSubmitSchema>;
export type ReportCheckInput = z.infer<typeof reportCheckSchema>;
export type ReportUpdateInput = z.infer<typeof reportUpdateSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
