import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  showName = true,
}: {
  className?: string;
  showName?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-sm">
        <Flame className="size-5 fill-white/30" />
      </span>
      {showName && (
        <span className="text-xl font-extrabold tracking-tight">
          Job<span className="text-gradient-brand">Swiper</span>
        </span>
      )}
    </div>
  );
}
