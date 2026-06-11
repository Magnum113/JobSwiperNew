import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";
import { LEGAL_LINKS } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Правовая информация | JobSwiper",
  description: "Оферта, возвраты, реквизиты и документы по персональным данным.",
  alternates: { canonical: "/legal" },
};

export default function LegalIndexPage() {
  return (
    <LegalPage
      title="Правовая информация"
      description="Документы сервиса JobSwiper для пользователей и платежной проверки."
    >
      <LegalSection title="Документы">
        <div className="grid gap-2">
          {LEGAL_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-xl border border-border/70 px-4 py-3 font-medium transition-colors hover:bg-muted"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </LegalSection>
    </LegalPage>
  );
}
