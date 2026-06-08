"use client";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  type PanInfo,
} from "motion/react";
import { Heart, X } from "lucide-react";
import { SwipeCard } from "./swipe-card";
import { cn } from "@/lib/utils";
import type { HHVacancyItem } from "@/lib/hh/types";
import type { MatchResult, SwipeDirection } from "@/lib/types";

const SWIPE_THRESHOLD = 110;
const VELOCITY_THRESHOLD = 600;

interface TopCardHandle {
  swipe: (dir: SwipeDirection) => void;
}

interface TopCardProps {
  vacancy: HHVacancyItem;
  match?: MatchResult;
  matchLoading?: boolean;
  onDetails: () => void;
  onSwipe: (vacancy: HHVacancyItem, dir: SwipeDirection) => void;
}

const TopCard = forwardRef<TopCardHandle, TopCardProps>(function TopCard(
  { vacancy, match, matchLoading, onDetails, onSwipe },
  ref,
) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-16, 0, 16]);
  const likeOpacity = useTransform(x, [30, 130], [0, 1]);
  const nopeOpacity = useTransform(x, [-30, -130], [0, 1]);
  const leaving = useRef(false);

  const swipe = (dir: SwipeDirection) => {
    if (leaving.current) return;
    leaving.current = true;
    const target = dir === "right" ? 800 : -800;
    animate(x, target, {
      type: "tween",
      duration: 0.32,
      ease: "easeOut",
      onComplete: () => onSwipe(vacancy, dir),
    });
  };

  useImperativeHandle(ref, () => ({ swipe }));

  const handleDragEnd = (_e: unknown, info: PanInfo) => {
    if (leaving.current) return;
    const { offset, velocity } = info;
    if (offset.x > SWIPE_THRESHOLD || velocity.x > VELOCITY_THRESHOLD) {
      swipe("right");
    } else if (
      offset.x < -SWIPE_THRESHOLD ||
      velocity.x < -VELOCITY_THRESHOLD
    ) {
      swipe("left");
    } else {
      animate(x, 0, { type: "spring", stiffness: 320, damping: 26 });
    }
  };

  return (
    <motion.div
      className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
      style={{ x, rotate }}
      drag="x"
      dragElastic={0.7}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.96, y: 8, opacity: 0.6 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
    >
      {/* LIKE / NOPE stamps */}
      <motion.div
        style={{ opacity: likeOpacity }}
        className="pointer-events-none absolute left-5 top-6 z-10 -rotate-12 rounded-xl border-4 border-emerald-500 px-3 py-1 text-2xl font-black uppercase tracking-wider text-emerald-500"
      >
        Откликнуться
      </motion.div>
      <motion.div
        style={{ opacity: nopeOpacity }}
        className="pointer-events-none absolute right-5 top-6 z-10 rotate-12 rounded-xl border-4 border-rose-500 px-3 py-1 text-2xl font-black uppercase tracking-wider text-rose-500"
      >
        Мимо
      </motion.div>

      <SwipeCard
        vacancy={vacancy}
        match={match}
        matchLoading={matchLoading}
        onDetails={onDetails}
      />
    </motion.div>
  );
});

interface SwipeDeckProps {
  items: HHVacancyItem[];
  matches: Record<string, MatchResult>;
  loadingIds: Set<string>;
  onSwipe: (vacancy: HHVacancyItem, dir: SwipeDirection) => void;
  onDetails: (vacancy: HHVacancyItem) => void;
}

export function SwipeDeck({
  items,
  matches,
  loadingIds,
  onSwipe,
  onDetails,
}: SwipeDeckProps) {
  const topRef = useRef<TopCardHandle>(null);
  const top = items[0];
  const background = items.slice(1, 3).reverse();

  // Keyboard controls for the top card.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!top) return;
      if (e.key === "ArrowRight") topRef.current?.swipe("right");
      if (e.key === "ArrowLeft") topRef.current?.swipe("left");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [top]);

  return (
    <div
      className="flex w-full flex-col items-center"
      style={{ gap: "clamp(0.75rem, 1.7svh, 1.5rem)" }}
    >
      {/* Card stack */}
      <div
        className="relative aspect-[3/4.35] w-full"
        style={{
          width:
            "min(100%, 24rem, calc(max(20rem, min(34rem, calc(100svh - 18rem))) * 0.689655))",
        }}
      >
        {background.map((item, idx) => {
          // background[last] is the closest card behind the top one
          const depth = background.length - idx; // 1 or 2
          return (
            <motion.div
              key={item.id}
              className="absolute inset-0"
              initial={false}
              animate={{
                scale: 1 - depth * 0.04,
                y: depth * 14,
                opacity: depth === 1 ? 1 : 0.85,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              style={{ zIndex: idx }}
            >
              <div className="pointer-events-none h-full">
                <SwipeCard
                  vacancy={item}
                  match={matches[item.id]}
                  interactive={false}
                />
              </div>
            </motion.div>
          );
        })}

        {top && (
          <div className="absolute inset-0" style={{ zIndex: 10 }}>
            <TopCard
              key={top.id}
              ref={topRef}
              vacancy={top}
              match={matches[top.id]}
              matchLoading={loadingIds.has(top.id)}
              onDetails={() => onDetails(top)}
              onSwipe={onSwipe}
            />
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-5 sm:gap-6">
        <button
          type="button"
          aria-label="Пропустить"
          onClick={() => topRef.current?.swipe("left")}
          disabled={!top}
          className={cn(
            "flex items-center justify-center rounded-full border-2 border-rose-200 bg-background text-rose-500 shadow-card transition-all hover:scale-105 hover:border-rose-500 hover:bg-rose-500 hover:text-white active:scale-95 disabled:opacity-40 dark:border-rose-500/30",
          )}
          style={{
            width: "clamp(3.5rem, 7svh, 4rem)",
            height: "clamp(3.5rem, 7svh, 4rem)",
          }}
        >
          <X className="size-6 sm:size-7" strokeWidth={3} />
        </button>
        <button
          type="button"
          aria-label="Откликнуться"
          onClick={() => topRef.current?.swipe("right")}
          disabled={!top}
          className={cn(
            "flex items-center justify-center rounded-full border-2 border-emerald-200 bg-background text-emerald-500 shadow-card transition-all hover:scale-105 hover:border-emerald-500 hover:bg-emerald-500 hover:text-white active:scale-95 disabled:opacity-40 dark:border-emerald-500/30",
          )}
          style={{
            width: "clamp(3.5rem, 7svh, 4rem)",
            height: "clamp(3.5rem, 7svh, 4rem)",
          }}
        >
          <Heart className="size-6 fill-current sm:size-7" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
