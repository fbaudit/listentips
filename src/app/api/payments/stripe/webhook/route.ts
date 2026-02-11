import { NextRequest, NextResponse } from "next/server";
import { constructWebhookEvent } from "@/lib/payments/stripe";
import { activateSubscription, cancelSubscription } from "@/lib/payments/subscription-manager";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const event = constructWebhookEvent(body, signature);
    const supabase = createAdminClient();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as unknown as {
          metadata: { companyId: string; planType: string };
          subscription: string;
          amount_total: number;
          currency: string;
        };
        const { companyId, planType } = session.metadata;

        await activateSubscription({
          companyId,
          planType: planType as "monthly" | "yearly",
          paymentProvider: "stripe",
          amount: session.amount_total || 0,
          currency: (session.currency || "usd").toUpperCase(),
          stripeSubscriptionId: session.subscription,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as { id: string };

        const { data: sub } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("stripe_subscription_id", subscription.id)
          .eq("status", "active")
          .single();

        if (sub) {
          await cancelSubscription(sub.id);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as unknown as {
          subscription: string;
        };

        const { data: sub } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("stripe_subscription_id", invoice.subscription)
          .eq("status", "active")
          .single();

        if (sub) {
          await supabase
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("id", sub.id);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
