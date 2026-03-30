import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "sans-serif", padding: "2rem" }}>
      <h1 style={{ fontSize: "3rem", fontWeight: "bold", marginBottom: "0.5rem" }}>404</h1>
      <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>
        페이지를 찾을 수 없습니다.
      </p>
      <Link
        href="/"
        style={{ padding: "0.5rem 1.5rem", backgroundColor: "#1a1a2e", color: "white", borderRadius: "0.5rem", textDecoration: "none", fontSize: "0.875rem" }}
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
