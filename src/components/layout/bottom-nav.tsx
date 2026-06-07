"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Heart, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store/use-app-store";

const TABS = [
  { href: "/", label: "Лента", icon: Flame },
  { href: "/liked", label: "Отклики", icon: Heart },
  { href: "/profile", label: "Кабинет", icon: UserRound },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const hydrated = useAppStore((s) => s.hydrated);
  const likedCount = useAppStore((s) => Object.keys(s.liked).length);

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-border/60 bg-background/80 p-1.5 shadow-card backdrop-blur-xl">
        {TABS.map((tab) => {
          const active =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          const showBadge = tab.href === "/liked" && hydrated && likedCount > 0;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "relative flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-gradient-brand text-white shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon
                className={cn("size-5", active && "fill-white/20")}
                strokeWidth={active ? 2.4 : 2}
              />
              <span className={cn(active ? "inline" : "hidden sm:inline")}>
                {tab.label}
              </span>
              {showBadge && (
                <span
                  className={cn(
                    "absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold tabular-nums",
                    active
                      ? "bg-white text-primary"
                      : "bg-gradient-brand text-white",
                  )}
                >
                  {likedCount > 99 ? "99+" : likedCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
