"use client";
import { useAppStore } from "@/lib/store/use-app-store";
import { getFreeLimits, type Limits } from "@/lib/plans";

export interface LimitsState {
  limits: Limits;
  used: Limits;
  remaining: Limits;
}

/** Free-plan limits, current usage and what's left (incl. the gifted bonus). */
export function useLimits(): LimitsState {
  const quota = useAppStore((s) => s.quota);
  const bonusClaimed = useAppStore((s) => s.proBonusClaimed);
  const purchasedLimits = useAppStore((s) => s.purchasedLimits);
  const freeLimits = getFreeLimits(bonusClaimed);
  const limits = {
    responses: freeLimits.responses + purchasedLimits.responses,
    analyses: freeLimits.analyses + purchasedLimits.analyses,
    resumes: freeLimits.resumes + purchasedLimits.resumes,
  };
  const used = {
    responses: quota.responsesUsed,
    analyses: quota.analysesUsed,
    resumes: quota.resumesUsed,
  };
  return {
    limits,
    used,
    remaining: {
      responses: Math.max(0, limits.responses - used.responses),
      analyses: Math.max(0, limits.analyses - used.analyses),
      resumes: Math.max(0, limits.resumes - used.resumes),
    },
  };
}
