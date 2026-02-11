import Link from "next/link";
import { useTranslations } from "next-intl";
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
            <h4 className="font-semibold mb-3">Links</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link href="/features" className="hover:text-primary">Features</Link>
              <Link href="/pricing" className="hover:text-primary">Pricing</Link>
              <Link href="/apply" className="hover:text-primary">Apply</Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Legal</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link href="/terms" className="hover:text-primary">{t("terms")}</Link>
              <Link href="/privacy" className="hover:text-primary">{t("privacy")}</Link>
              <Link href="/contact" className="hover:text-primary">{t("contact")}</Link>
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
