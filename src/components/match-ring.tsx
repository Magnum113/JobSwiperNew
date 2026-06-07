"use client";
import { cn } from "@/lib/utils";
import { matchStyle } from "@/lib/match-style";

interface MatchRingProps {
  score: number | null;
  loading?: boolean;
  size?: number;
  stroke?: number;
  className?: string;
}

export function MatchRing({
  score,
  loading,
  size = 56,
  stroke = 5,
  className,
}: MatchRingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = score == null ? 0 : Math.min(100, Math.max(0, score));
  const offset = circumference - (pct / 100) * circumference;
  const style = score == null ? null : matchStyle(pct);

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={
        score == null ? "Совместимость рассчитывается" : `Совпадение ${pct}%`
      }
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        {score != null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            stroke={style!.stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.7s ease" }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {loading && score == null ? (
          <span className="size-3 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
        ) : score == null ? (
          <span className="text-[10px] font-medium text-muted-foreground">
            —
          </span>
        ) : (
          <span
            className={cn(
              "font-bold tabular-nums leading-none",
              style!.text,
            )}
            style={{ fontSize: size * 0.28 }}
          >
            {pct}
          </span>
        )}
      </div>
    </div>
  );
}
