import Link from "next/link";
import { LEGAL_LINKS, SELLER } from "@/lib/legal";

interface LegalPageProps {
  title: string;
  description: string;
  updatedAt?: string;
  children: React.ReactNode;
}

export function LegalPage({
  title,
  description,
  updatedAt = "10 июня 2026 года",
  children,
}: LegalPageProps) {
  return (
    <div className="px-4 py-6 sm:px-8">
      <article className="rounded-2xl border border-border/70 bg-card px-5 py-6 shadow-sm sm:px-7">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Правовая информация
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          Дата публикации и последнего обновления: {updatedAt}
        </p>

        <div className="legal-document mt-6 space-y-6 text-sm leading-6 text-foreground/90">
          {children}
        </div>

        <div className="mt-8 border-t border-border/70 pt-5 text-xs leading-5 text-muted-foreground">
          <p>
            Продавец: {SELLER.name}, ИНН {SELLER.inn}, ОГРНИП{" "}
            {SELLER.ogrnip}.
          </p>
          <nav className="mt-3 flex flex-wrap gap-x-3 gap-y-2">
            {LEGAL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="underline-offset-4 hover:text-foreground hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </article>
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-base font-bold text-foreground">{title}</h2>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  );
}

export function LegalList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
