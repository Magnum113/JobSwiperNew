import Link from "next/link";
import { LEGAL_LINKS, SELLER } from "@/lib/legal";

export function LegalFooter() {
  return (
    <footer className="px-4 pb-28 pt-2 text-center text-[11px] leading-5 text-muted-foreground sm:px-8">
      <nav className="flex flex-wrap justify-center gap-x-3 gap-y-1">
        {LEGAL_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            {link.label}
          </Link>
        ))}
        <a
          href={`mailto:${SELLER.email}`}
          className="underline-offset-4 hover:text-foreground hover:underline"
        >
          Поддержка
        </a>
      </nav>
      <p className="mt-2">
        {SELLER.shortName}, ИНН {SELLER.inn}, ОГРНИП {SELLER.ogrnip}
      </p>
    </footer>
  );
}
