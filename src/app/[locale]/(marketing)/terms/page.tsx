import { useTranslations } from "next-intl";

export default function TermsPage() {
  const t = useTranslations("common");

  return (
    <div className="container max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8">이용약관</h1>

      <div className="prose prose-sm max-w-none space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-3">제 1 조 (목적)</h2>
          <p className="text-muted-foreground leading-relaxed">
            이 약관은 Listen(이하 &quot;회사&quot;)이 제공하는 익명 제보채널 서비스(이하 &quot;서비스&quot;)의 이용 조건 및 절차, 회사와 이용자의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">제 2 조 (용어의 정의)</h2>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>&quot;서비스&quot;란 회사가 제공하는 SaaS 형태의 익명 제보채널 플랫폼을 의미합니다.</li>
            <li>&quot;이용자&quot;란 본 약관에 따라 서비스를 이용하는 기업, 기관 및 그 소속원을 말합니다.</li>
            <li>&quot;제보자&quot;란 서비스를 통해 익명으로 제보를 접수하는 자를 말합니다.</li>
            <li>&quot;관리자&quot;란 기업/기관의 제보 관리 권한을 가진 담당자를 말합니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">제 3 조 (약관의 효력 및 변경)</h2>
          <p className="text-muted-foreground leading-relaxed">
            본 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다. 회사는 관련 법령을 위배하지 않는 범위 내에서 본 약관을 변경할 수 있으며, 변경 시 최소 7일 전에 공지합니다.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">제 4 조 (서비스의 내용)</h2>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>익명 제보 접수 및 관리 시스템</li>
            <li>제보자와 관리자 간 양방향 커뮤니케이션</li>
            <li>AI 기반 제보 내용 검증 (선택)</li>
            <li>통계 대시보드 및 보고서</li>
            <li>다국어 지원 (한국어, 영어, 일본어, 중국어)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">제 5 조 (개인정보 보호)</h2>
          <p className="text-muted-foreground leading-relaxed">
            회사는 제보자의 익명성을 보장하기 위해 최선을 다하며, IP 주소는 해시 처리하여 원본을 저장하지 않습니다. 회사의 개인정보 처리방침에 따라 이용자의 개인정보를 보호합니다.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">제 6 조 (이용요금 및 결제)</h2>
          <p className="text-muted-foreground leading-relaxed">
            서비스 이용요금은 회사가 정한 요금 정책에 따르며, 무료 체험 기간 종료 후 유료 구독으로 전환됩니다. 결제는 Toss Payments 또는 Stripe를 통해 처리됩니다.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">제 7 조 (면책조항)</h2>
          <p className="text-muted-foreground leading-relaxed">
            회사는 천재지변 또는 이에 준하는 불가항력으로 인해 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.
          </p>
        </section>

        <p className="text-sm text-muted-foreground pt-4 border-t">
          시행일: 2025년 1월 1일
        </p>
      </div>
    </div>
  );
}
