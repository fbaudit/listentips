const TOSS_API_URL = "https://api.tosspayments.com/v1";

function getAuthHeader() {
  const key = process.env.TOSS_SECRET_KEY!;
  const encoded = Buffer.from(`${key}:`).toString("base64");
  return `Basic ${encoded}`;
}

export interface TossPaymentConfirmRequest {
  paymentKey: string;
  orderId: string;
  amount: number;
}

export interface TossPaymentResponse {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
  method: string;
  approvedAt: string;
  receipt?: { url: string };
}

export async function confirmTossPayment(
  params: TossPaymentConfirmRequest
): Promise<TossPaymentResponse> {
  const response = await fetch(`${TOSS_API_URL}/payments/confirm`, {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Toss payment confirmation failed");
  }

  return response.json();
}

export async function cancelTossPayment(
  paymentKey: string,
  reason: string
): Promise<TossPaymentResponse> {
  const response = await fetch(
    `${TOSS_API_URL}/payments/${paymentKey}/cancel`,
    {
      method: "POST",
      headers: {
        Authorization: getAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cancelReason: reason }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Toss payment cancellation failed");
  }

  return response.json();
}

export function generateTossOrderId(companyId: string, planType: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `ORD-${companyId.substring(0, 8)}-${planType}-${timestamp}-${random}`.toUpperCase();
}
