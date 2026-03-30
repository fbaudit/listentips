export async function verifyCaptcha(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // Only skip in development; production must have TURNSTILE_SECRET_KEY
    if (process.env.NODE_ENV === "production") {
      console.error("TURNSTILE_SECRET_KEY is not set in production");
      return false;
    }
    return true;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret,
        response: token,
      }),
      signal: controller.signal,
    }
  ).finally(() => clearTimeout(timer));

  const data = await response.json();
  return data.success === true;
}
