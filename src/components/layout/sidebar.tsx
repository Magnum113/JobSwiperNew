"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Heart, UserRound } from "lucide-react";
import { BrandMark } from "@/components/brand";
import { ProButton } from "@/components/paywall/pro-button";
import { useAppStore } from "@/lib/store/use-app-store";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Лента", icon: Flame },
  { href: "/liked", label: "Отклики", icon: Heart },
  { href: "/profile", label: "Кабинет", icon: UserRound },
] as const;

/**
 * Desktop-only left navigation rail (the app shell on ≥ lg). On mobile the
 * floating BottomNav handles navigation, so this is hidden below lg. Mirrors
 * BottomNav's tab data + liked badge so the two stay in sync.
 */
export function Sidebar() {
  const pathname = usePathname();
  const hydrated = useAppStore((s) => s.hydrated);
  const likedCount = useAppStore((s) => Object.keys(s.liked).length);
  const badgeText = likedCount > 99 ? "99+" : String(likedCount);

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-1 border-r border-border/50 bg-background/55 px-4 py-6 backdrop-blur-xl lg:flex">
      <div className="px-2 pb-5">
        <Link href="/" aria-label="JobSwiper — на главную">
          <BrandMark />
        </Link>
      </div>

      <nav className="flex flex-col gap-1.5">
        {TABS.map((tab) => {
          const active =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          const showBadge = tab.href === "/liked" && hydrated && likedCount > 0;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-gradient-brand text-white shadow-[0_10px_26px_oklch(0.55_0.235_285_/_0.25)]"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon
                className={cn("size-5", active && "fill-white/25")}
                strokeWidth={active ? 2.4 : 2}
              />
              <span>{tab.label}</span>
              {showBadge && (
                <span
                  className={cn(
                    "ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold leading-none tabular-nums",
                    active ? "bg-white text-primary" : "bg-gradient-brand text-white",
                  )}
                >
                  {badgeText}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-1">
        <ProButton source="sidebar" className="w-full justify-center py-2.5 text-sm" />
      </div>
    </aside>
  );
}
