import { useTranslations } from "next-intl";

export default function PrivacyPage() {
  const t = useTranslations("common");

  return (
    <div className="container max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8">개인정보 처리방침</h1>

      <div className="prose prose-sm max-w-none space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-3">1. 수집하는 개인정보 항목</h2>
          <p className="text-muted-foreground leading-relaxed">회사는 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다:</p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li><strong>기업 관리자:</strong> 이름, 이메일, 전화번호, 로그인 정보</li>
            <li><strong>제보자:</strong> 제보 내용, 첨부 파일 (자발적 제공 시)</li>
            <li><strong>자동 수집:</strong> IP 주소(해시 처리), 접속 시간, 브라우저 정보</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">2. 개인정보 수집 목적</h2>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>서비스 제공 및 운영</li>
            <li>이용자 본인확인 및 인증</li>
            <li>서비스 개선 및 통계 분석</li>
            <li>법적 의무 이행</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">3. 익명성 보장</h2>
          <p className="text-muted-foreground leading-relaxed">
            제보자의 익명성은 서비스의 핵심 가치입니다. 다음과 같은 방법으로 익명성을 보장합니다:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>IP 주소는 SHA-256 해시 처리하여 원본을 저장하지 않습니다</li>
            <li>제보는 접수번호와 비밀번호만으로 접근하며, 계정 연동이 없습니다</li>
            <li>기업 관리자도 제보자의 신원을 파악할 수 없습니다</li>
            <li>서버 로그에 제보자 식별 정보를 기록하지 않습니다</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">4. 개인정보 보유 기간</h2>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>기업 관리자 정보: 서비스 해지 시까지</li>
            <li>제보 데이터: 기업의 보유 정책에 따름 (기본 3년)</li>
            <li>결제 정보: 전자상거래법에 따라 5년</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">5. 개인정보의 제3자 제공</h2>
          <p className="text-muted-foreground leading-relaxed">
            회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 법률에 의해 요구되는 경우에는 예외로 합니다.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">6. 개인정보 보호 조치</h2>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>비밀번호 bcrypt 암호화 (12라운드)</li>
            <li>전송 구간 TLS/SSL 암호화</li>
            <li>Row Level Security(RLS)를 통한 데이터 격리</li>
            <li>정기 보안 점검 및 취약점 진단</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">7. 이용자 권리</h2>
          <p className="text-muted-foreground leading-relaxed">
            이용자는 언제든지 자신의 개인정보를 조회, 수정, 삭제할 수 있으며, 서비스 해지를 통해 개인정보 삭제를 요청할 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">8. 문의</h2>
          <p className="text-muted-foreground leading-relaxed">
            개인정보 관련 문의사항은 privacy@listen.co.kr로 연락 주시기 바랍니다.
          </p>
        </section>

        <p className="text-sm text-muted-foreground pt-4 border-t">
          시행일: 2025년 1월 1일
        </p>
      </div>
    </div>
  );
}
