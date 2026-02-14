import { createAdminClient } from "@/lib/supabase/admin";

type PlanType = "free_trial" | "monthly" | "yearly";
type PaymentProvider = "toss" | "stripe";

interface ActivateSubscriptionParams {
  companyId: string;
  planType: PlanType;
  paymentProvider: PaymentProvider;
  amount: number;
  currency: string;
  paymentKey?: string;
  stripeSubscriptionId?: string;
}

export async function activateSubscription(params: ActivateSubscriptionParams) {
  const supabase = createAdminClient();
  const now = new Date();
  const endDate = new Date(now);

  if (params.planType === "yearly") {
    endDate.setFullYear(endDate.getFullYear() + 1);
  } else {
    endDate.setDate(endDate.getDate() + 30);
  }

  // Cancel existing active subscriptions
  await supabase
    .from("subscriptions")
    .update({ status: "cancelled" })
    .eq("company_id", params.companyId)
    .eq("status", "active");

  // Create new subscription
  const { data, error } = await supabase
    .from("subscriptions")
    .insert({
      company_id: params.companyId,
      plan_type: params.planType,
      status: "active",
      start_date: now.toISOString(),
      end_date: endDate.toISOString(),
      amount: params.amount,
      currency: params.currency,
      payment_provider: params.paymentProvider,
      payment_key: params.paymentKey || null,
      stripe_subscription_id: params.stripeSubscriptionId || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Subscription activation error:", error);
    throw new Error("구독 활성화 중 오류가 발생했습니다");
  }

  // Update company service dates
  await supabase
    .from("companies")
    .update({
      service_start: now.toISOString(),
      service_end: endDate.toISOString(),
    })
    .eq("id", params.companyId);

  return data;
}

export async function cancelSubscription(subscriptionId: string) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", subscriptionId);

  if (error) {
    console.error("Subscription cancellation error:", error);
    throw new Error("구독 취소 중 오류가 발생했습니다");
  }
}

export async function checkExpiredSubscriptions() {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  let totalProcessed = 0;

  // 1. Check active subscriptions that have expired
  const { data: expiredActive } = await supabase
    .from("subscriptions")
    .select("id, company_id")
    .eq("status", "active")
    .lt("end_date", now);

  // 2. Check cancelled subscriptions that have passed their end date
  const { data: expiredCancelled } = await supabase
    .from("subscriptions")
    .select("id, company_id")
    .eq("status", "cancelled")
    .lt("end_date", now);

  const allExpired = [...(expiredActive || []), ...(expiredCancelled || [])];

  const processedCompanyIds = new Set<string>();

  for (const sub of allExpired) {
    await supabase
      .from("subscriptions")
      .update({ status: "expired" })
      .eq("id", sub.id);

    await supabase
      .from("companies")
      .update({ is_active: false })
      .eq("id", sub.company_id);

    processedCompanyIds.add(sub.company_id);
    totalProcessed++;
  }

  // 3. Check companies whose service_end has passed (regardless of subscription)
  const { data: expiredCompanies } = await supabase
    .from("companies")
    .select("id")
    .eq("is_active", true)
    .lt("service_end", now);

  for (const company of expiredCompanies || []) {
    if (processedCompanyIds.has(company.id)) continue;

    await supabase
      .from("companies")
      .update({ is_active: false })
      .eq("id", company.id);

    totalProcessed++;
  }

  return totalProcessed;
}
