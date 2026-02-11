import Stripe from "stripe";

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-01-27.acacia" as Stripe.LatestApiVersion,
    });
  }
  return _stripe;
}

export { getStripe as stripe };

export interface CreateCheckoutParams {
  companyId: string;
  companyName: string;
  planType: "monthly" | "yearly";
  email: string;
  locale?: string;
  successUrl: string;
  cancelUrl: string;
}

const STRIPE_PRICES: Record<string, { amount: number; interval: "month" | "year" }> = {
  monthly: { amount: 15000, interval: "month" }, // $150.00
  yearly: { amount: 150000, interval: "year" }, // $1,500.00
};

export async function createCheckoutSession(params: CreateCheckoutParams) {
  const stripe = getStripe();
  const priceConfig = STRIPE_PRICES[params.planType];
  if (!priceConfig) throw new Error("Invalid plan type");

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: params.email,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: priceConfig.amount,
          recurring: { interval: priceConfig.interval },
          product_data: {
            name: `Listen - ${params.planType === "monthly" ? "Monthly" : "Yearly"} Plan`,
            description: `Whistleblowing channel for ${params.companyName}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      companyId: params.companyId,
      planType: params.planType,
    },
    locale: (params.locale as Stripe.Checkout.SessionCreateParams.Locale) || "auto",
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  });

  return session;
}

export async function cancelStripeSubscription(subscriptionId: string) {
  return getStripe().subscriptions.cancel(subscriptionId);
}

export function constructWebhookEvent(
  body: string | Buffer,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  return getStripe().webhooks.constructEvent(body, signature, webhookSecret);
}
