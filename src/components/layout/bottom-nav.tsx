"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Heart, UserRound } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
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

  // The sliding gradient highlight ("magic move") + active-label reveal springs.
  const pillTransition = reduce
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 380, damping: 34, mass: 0.75 };
  const iconTransition = reduce
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 430, damping: 28, mass: 0.55 };
  const labelTransition = reduce
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 520, damping: 36, mass: 0.45 };

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-border/60 bg-background/85 p-1.5 shadow-card backdrop-blur-xl">
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
                "relative flex h-11 items-center justify-center overflow-hidden rounded-full text-sm font-medium outline-none transition-[width,color] duration-300 focus-visible:ring-2 focus-visible:ring-ring",
                active ? "w-[6.25rem]" : "w-11",
                active ? "text-white" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {/* Sliding gradient highlight (shared layout) */}
              {active && (
                <motion.span
                  layoutId="nav-active-pill"
                  transition={pillTransition}
                  className="absolute inset-0 rounded-full bg-gradient-brand shadow-[0_10px_26px_oklch(0.55_0.235_285_/_0.28)]"
                />
              )}

              {/* Pressable content */}
              <motion.span
                whileTap={reduce ? undefined : { scale: 0.92 }}
                transition={{ type: "spring", stiffness: 500, damping: 28 }}
                className="relative z-10 flex items-center justify-center gap-1.5"
              >
                <motion.span
                  animate={
                    reduce
                      ? undefined
                      : { scale: active ? 1.08 : 1, y: active ? -1 : 0 }
                  }
                  transition={iconTransition}
                  className="grid place-items-center"
                >
                  <Icon
                    className={cn("size-5", active && "fill-white/25")}
                    strokeWidth={active ? 2.4 : 2}
                  />
                </motion.span>

                <AnimatePresence initial={false}>
                  {active && (
                    <motion.span
                      key={`${tab.href}-label`}
                      initial={reduce ? false : { width: 0, opacity: 0, x: -4 }}
                      animate={reduce ? undefined : { width: "auto", opacity: 1, x: 0 }}
                      exit={reduce ? undefined : { width: 0, opacity: 0, x: -4 }}
                      transition={labelTransition}
                      className="overflow-hidden whitespace-nowrap text-xs leading-none"
                    >
                      {tab.label}
                    </motion.span>
                  )}
                </AnimatePresence>
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
