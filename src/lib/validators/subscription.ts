import { z } from "zod";

export const subscriptionCreateSchema = z.object({
  companyId: z.string().uuid(),
  planType: z.enum(["free_trial", "monthly", "yearly"]),
  paymentProvider: z.enum(["toss", "stripe"]).optional(),
  amount: z.number().int().min(0).optional(),
  currency: z.string().default("KRW"),
});

export type SubscriptionCreateInput = z.infer<typeof subscriptionCreateSchema>;
