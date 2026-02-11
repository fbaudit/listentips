import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventType, data } = body;

    const supabase = createAdminClient();

    switch (eventType) {
      case "PAYMENT_STATUS_CHANGED": {
        const { paymentKey, status } = data;

        if (status === "CANCELED" || status === "EXPIRED") {
          // Find subscription by payment key and cancel
          const { data: sub } = await supabase
            .from("subscriptions")
            .select("id, company_id")
            .eq("payment_key", paymentKey)
            .eq("status", "active")
            .single();

          if (sub) {
            await supabase
              .from("subscriptions")
              .update({ status: "cancelled" })
              .eq("id", sub.id);
          }
        }
        break;
      }
      default:
        break;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Toss webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
