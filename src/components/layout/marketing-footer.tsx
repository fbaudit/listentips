import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Shield } from "lucide-react";

export function MarketingFooter() {
  const t = useTranslations("footer");

  return (
    <footer className="border-t bg-muted/50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 font-bold text-lg mb-3">
              <Shield className="h-5 w-5 text-primary" />
              {t("company")}
            </div>
            <p className="text-sm text-muted-foreground">{t("description")}</p>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Information</h4>
            <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
              <span>에이치엠컴퍼니(주)</span>
              <span>사업자번호: 214-88-85057</span>
              <span>대표자: 조근호</span>
              <span>대표전화: 02-6237-6233</span>
              <span>팩스: 02-6237-6240</span>
              <span>서울특별시 서초구 효령로70길 36-9, 와이엘타워 2층, 3층</span>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Legal</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link href="/terms" className="hover:text-primary">{t("terms")}</Link>
              <Link href="/privacy" className="hover:text-primary">{t("privacy")}</Link>
              <a href="mailto:office@hmcom.co.kr" className="hover:text-primary">{t("contact")}</a>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          {t("copyright")}
        </div>
      </div>
    </footer>
  );
}
