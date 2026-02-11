import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { createCheckoutSession } from "@/lib/payments/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { planType, locale } = await request.json();

    if (!planType || !["monthly", "yearly"].includes(planType)) {
      return NextResponse.json({ error: "Invalid plan type" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: company } = await supabase
      .from("companies")
      .select("company_name")
      .eq("id", session.user.companyId)
      .single();

    const origin = request.headers.get("origin") || process.env.NEXTAUTH_URL || "";

    const checkoutSession = await createCheckoutSession({
      companyId: session.user.companyId,
      companyName: company?.company_name || "Unknown",
      planType,
      email: session.user.email!,
      locale,
      successUrl: `${origin}/${locale || "ko"}/company/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/${locale || "ko"}/company/subscription?cancelled=true`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "결제 세션 생성 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
