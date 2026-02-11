import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { confirmTossPayment } from "@/lib/payments/toss";
import { activateSubscription } from "@/lib/payments/subscription-manager";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { paymentKey, orderId, amount, planType } = await request.json();

    if (!paymentKey || !orderId || !amount || !planType) {
      return NextResponse.json({ error: "필수 파라미터가 누락되었습니다" }, { status: 400 });
    }

    // Confirm with Toss
    const payment = await confirmTossPayment({ paymentKey, orderId, amount });

    // Activate subscription
    const subscription = await activateSubscription({
      companyId: session.user.companyId,
      planType,
      paymentProvider: "toss",
      amount: payment.totalAmount,
      currency: "KRW",
      paymentKey: payment.paymentKey,
    });

    return NextResponse.json({
      subscription,
      payment: {
        orderId: payment.orderId,
        status: payment.status,
        amount: payment.totalAmount,
        approvedAt: payment.approvedAt,
        receiptUrl: payment.receipt?.url,
      },
    });
  } catch (error) {
    console.error("Toss payment confirm error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "결제 확인 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
