// Zero-JS, SSR-friendly FAQ accordion using native <details>. Same pattern as
// the landing FAQ in guest-home.tsx, so it stays in the existing visual system
// and works for crawlers without hydration. The FAQPage JSON-LD is emitted by
// the page that renders this.
export function LandingFaq({
  items,
}: {
  items: { question: string; answer: string }[];
}) {
  return (
    <div className="grid gap-3">
      {items.map(({ question, answer }) => (
        <details
          key={question}
          className="group rounded-2xl border border-border/65 bg-background/82 p-4 shadow-sm"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold text-foreground">
            {question}
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-lg leading-none text-violet-600 transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{answer}</p>
        </details>
      ))}
    </div>
  );
}
