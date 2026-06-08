"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Heart, UserRound } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
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
  const reduce = useReducedMotion();

  // The sliding gradient highlight ("magic move") + label reveal springs.
  const pillTransition = reduce
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 420, damping: 34, mass: 0.7 };
  const labelTransition = reduce
    ? { duration: 0 }
    : { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const };
  const iconTransition = { type: "spring" as const, stiffness: 440, damping: 24 };

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
              aria-label={tab.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center rounded-full px-4 py-2.5 text-sm font-medium outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-ring",
                active ? "text-white" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {/* Sliding gradient highlight (shared layout) */}
              {active && (
                <motion.span
                  layoutId="nav-active-pill"
                  transition={pillTransition}
                  className="absolute inset-0 rounded-full bg-gradient-brand shadow-sm"
                />
              )}

              {/* Pressable content */}
              <motion.span
                whileTap={reduce ? undefined : { scale: 0.86 }}
                transition={{ type: "spring", stiffness: 500, damping: 28 }}
                className="relative z-10 grid grid-flow-col items-center"
              >
                <motion.span
                  animate={reduce ? undefined : { scale: active ? 1.1 : 1, y: active ? -1 : 0 }}
                  transition={iconTransition}
                  className="grid place-items-center"
                >
                  <Icon
                    className={cn("size-5", active && "fill-white/25")}
                    strokeWidth={active ? 2.4 : 2}
                  />
                </motion.span>

                {/* Grid-column reveal avoids animating text width to "auto". */}
                <motion.span
                  aria-hidden="true"
                  animate={{
                    gridTemplateColumns: active ? "1fr" : "0fr",
                    opacity: active ? 1 : 0,
                    paddingLeft: active ? 8 : 0,
                  }}
                  transition={labelTransition}
                  className="grid min-w-0 overflow-hidden whitespace-nowrap"
                >
                  <span className="min-w-0 overflow-hidden">{tab.label}</span>
                </motion.span>
              </motion.span>

              {/* Liked count badge */}
              {showBadge && (
                <motion.span
                  initial={reduce ? false : { scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 20 }}
                  className={cn(
                    "absolute -right-0.5 -top-0.5 z-20 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold tabular-nums",
                    active ? "bg-white text-primary" : "bg-gradient-brand text-white",
                  )}
                >
                  {likedCount > 99 ? "99+" : likedCount}
                </motion.span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
