"use client";
import { Crown } from "lucide-react";
import { useAppStore } from "@/lib/store/use-app-store";
import { cn } from "@/lib/utils";

/** Compact gradient pill used in page headers to open limit packs. */
export function ProButton({
  source,
  className,
}: {
  source?: string;
  className?: string;
}) {
  const openPaywall = useAppStore((s) => s.openPaywall);
  return (
    <button
      type="button"
      onClick={() => openPaywall(source)}
      aria-label="Пакеты лимитов JobSwiper"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-gradient-brand px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-transform hover:scale-105 active:scale-95",
        className,
      )}
    >
      <Crown className="size-3.5 fill-white/40" />
      Лимиты
    </button>
  );
}
