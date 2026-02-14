import { NextRequest, NextResponse } from "next/server";
import { checkExpiredSubscriptions } from "@/lib/payments/subscription-manager";

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const count = await checkExpiredSubscriptions();
    return NextResponse.json({
      message: `Processed ${count || 0} expired subscriptions`,
      count: count || 0,
    });
  } catch (error) {
    console.error("Cron check-subscriptions error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
