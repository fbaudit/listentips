"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "sans-serif", padding: "2rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem" }}>
            오류가 발생했습니다
          </h1>
          <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>
            예기치 않은 오류가 발생했습니다. 다시 시도해 주세요.
          </p>
          <button
            onClick={() => reset()}
            style={{ padding: "0.5rem 1.5rem", backgroundColor: "#1a1a2e", color: "white", border: "none", borderRadius: "0.5rem", cursor: "pointer", fontSize: "0.875rem" }}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
