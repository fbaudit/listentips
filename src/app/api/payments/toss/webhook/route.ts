import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

function verifyTossSignature(body: string, signature: string | null): boolean {
  const secretKey = process.env.TOSS_WEBHOOK_SECRET;
  if (!secretKey) {
    console.error("TOSS_WEBHOOK_SECRET is not configured");
    return false;
  }
  if (!signature) return false;

  const expected = crypto
    .createHmac("sha256", secretKey)
    .update(body)
    .digest("base64");

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expectedBuf);
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-toss-signature");

    // Verify webhook signature if secret is configured
    if (process.env.TOSS_WEBHOOK_SECRET) {
      if (!verifyTossSignature(rawBody, signature)) {
        console.error("Toss webhook signature verification failed");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const body = JSON.parse(rawBody);
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
