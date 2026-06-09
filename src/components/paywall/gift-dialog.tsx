"use client";
import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Gift, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store/use-app-store";
import { BONUS_RESPONSES } from "@/lib/plans";

const CONFETTI_COLORS = [
  "#7c3aed",
  "#ec4899",
  "#10b981",
  "#f59e0b",
  "#38bdf8",
];

export function GiftDialog() {
  const open = useAppStore((s) => s.giftDialogOpen);
  const closeGiftDialog = useAppStore((s) => s.closeGiftDialog);
  const reduce = useReducedMotion();

  // Pre-computed confetti burst (deterministic so it stays render-pure).
  const confetti = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => {
        const angle = (i / 18) * Math.PI * 2;
        const dist = 90 + (i % 5) * 28;
        return {
          id: i,
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist + 70,
          rotate: ((i * 47) % 360) - 180,
          delay: (i % 6) * 0.03,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          round: i % 3 === 0,
        };
      }),
    [],
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeGiftDialog()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[20rem] overflow-hidden text-center"
      >
        {/* Confetti burst */}
        {!reduce && open && (
          <div className="pointer-events-none absolute inset-x-0 top-10 z-0 flex justify-center">
            {confetti.map((c) => (
              <motion.span
                key={c.id}
                className="absolute block size-2"
                style={{
                  backgroundColor: c.color,
                  borderRadius: c.round ? "9999px" : "2px",
                }}
                initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  x: c.x,
                  y: c.y,
                  rotate: c.rotate,
                  scale: [0, 1, 1, 0.8],
                }}
                transition={{ duration: 1.3, delay: c.delay, ease: "easeOut" }}
              />
            ))}
          </div>
        )}

        <div className="relative z-10 flex flex-col items-center gap-3 pt-3">
          {/* Gift badge */}
          <motion.div
            className="relative inline-flex size-20 items-center justify-center rounded-3xl bg-gradient-brand text-white shadow-lg"
            initial={reduce ? false : { scale: 0, rotate: -25 }}
            animate={
              reduce
                ? undefined
                : { scale: 1, rotate: 0, y: [0, -6, 0] }
            }
            transition={{
              scale: { type: "spring", stiffness: 260, damping: 13 },
              rotate: { type: "spring", stiffness: 260, damping: 13 },
              y: {
                duration: 2.4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.4,
              },
            }}
          >
            <Gift className="size-10" />
            {!reduce &&
              [
                { style: { top: "-8px", left: "-6px" }, delay: 0.3, size: 16 },
                { style: { top: "-2px", right: "-10px" }, delay: 0.55, size: 13 },
                { style: { bottom: "-6px", left: "-2px" }, delay: 0.8, size: 12 },
              ].map((sp, i) => (
                <motion.span
                  key={i}
                  className="absolute text-amber-300"
                  style={sp.style}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
                  transition={{
                    duration: 1.6,
                    repeat: Infinity,
                    delay: sp.delay,
                    ease: "easeInOut",
                  }}
                >
                  <Sparkles style={{ width: sp.size, height: sp.size }} />
                </motion.span>
              ))}
          </motion.div>

          {/* +50 */}
          <motion.p
            className="text-gradient-brand text-5xl font-extrabold tracking-tight"
            initial={reduce ? false : { scale: 0, y: 12, opacity: 0 }}
            animate={reduce ? undefined : { scale: 1, y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 16, delay: 0.18 }}
          >
            +{BONUS_RESPONSES}
          </motion.p>

          <DialogTitle className="text-lg font-bold">
            Это вам подарок!
          </DialogTitle>
          <p className="text-sm leading-snug text-muted-foreground">
            Сервис ещё в разработке, и оплата подписки пока недоступна. Поэтому
            дарим вам <span className="font-semibold text-foreground">{BONUS_RESPONSES} откликов</span> бесплатно.
          </p>

          <Button
            onClick={closeGiftDialog}
            className="mt-2 h-11 w-full rounded-xl bg-gradient-brand text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.01] hover:opacity-95"
          >
            <Sparkles className="size-4 fill-white/40" />
            Забрать
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
