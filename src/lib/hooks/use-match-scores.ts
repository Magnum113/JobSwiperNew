"use client";
import { useEffect, useRef, useState } from "react";
import { postMatch } from "@/lib/api-client";
import { pushMatches } from "@/lib/db-sync";
import { useAppStore } from "@/lib/store/use-app-store";
import { getFreeLimits } from "@/lib/plans";
import type { HHVacancyItem } from "@/lib/hh/types";
import type { MatchResult } from "@/lib/types";

const BATCH_SIZE = 10; // max vacancies per /api/match request
const WINDOW = 18; // how many upcoming cards to keep pre-scored
const MAX_CONCURRENT = 3; // parallel scoring requests in flight

/**
 * Lazily computes AI match scores for the top of the deck, keeping several
 * requests in flight at once so scoring stays ahead of a fast swiper. Bounded by
 * the account's analysis quota (in-flight cards are reserved against it), and
 * each vacancy is attempted at most once per resume to avoid burning quota.
 */
export function useMatchScores(
  items: HHVacancyItem[],
  resumeContext: string,
  enabled: boolean,
) {
  const matches = useAppStore((s) => s.matches);
  const setMatches = useAppStore((s) => s.setMatches);
  const userId = useAppStore((s) => s.userId);

  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const stateRef = useRef({
    ctx: "",
    attempted: new Set<string>(),
    inFlight: new Set<string>(),
    running: 0, // number of batches currently in flight
  });
  const [tick, setTick] = useState(0);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  const windowIds = items
    .slice(0, WINDOW)
    .map((v) => v.id)
    .join(",");

  useEffect(() => {
    const st = stateRef.current;
    // Reset tracking when the resume changes.
    if (st.ctx !== resumeContext) {
      st.ctx = resumeContext;
      st.attempted = new Set();
      st.inFlight = new Set();
      st.running = 0;
      setLoadingIds(new Set());
    }
    if (!enabled || !resumeContext) return;
    if (st.running >= MAX_CONCURRENT) return; // concurrency cap reached

    // Stop scoring once the account's analysis quota is used up. In-flight cards
    // aren't counted against quota until they succeed, so reserve them now to
    // avoid overspending across parallel batches.
    const { quota, proBonusClaimed, purchasedLimits } = useAppStore.getState();
    const freeLimits = getFreeLimits(proBonusClaimed);
    const analysesLeft =
      freeLimits.analyses + purchasedLimits.analyses - quota.analysesUsed;
    let budget = analysesLeft - st.inFlight.size;
    if (budget <= 0) return;

    const candidates = itemsRef.current
      .slice(0, WINDOW)
      .filter(
        (v) =>
          matches[v.id] == null &&
          !st.attempted.has(v.id) &&
          !st.inFlight.has(v.id),
      );
    if (candidates.length === 0) return;

    const ctxAtLaunch = resumeContext;
    const runBatch = (pending: HHVacancyItem[]) => {
      postMatch(resumeContext, pending)
        .then((results) => {
          // Drop stale results if the resume changed mid-flight.
          if (stateRef.current.ctx !== ctxAtLaunch) return;
          const entries: Record<string, MatchResult> = {};
          const toPersist: { vacancy: HHVacancyItem; match: MatchResult }[] = [];
          for (const r of results) {
            if (r.ok) {
              const m: MatchResult = {
                score: r.score,
                strengths: r.strengths,
                gaps: r.gaps,
                summary: r.summary,
              };
              entries[r.id] = m;
              const vac = pending.find((v) => v.id === r.id);
              if (vac) toPersist.push({ vacancy: vac, match: m });
            }
          }
          const scored = Object.keys(entries).length;
          if (scored) {
            setMatches(entries);
            useAppStore.getState().consumeAnalyses(scored); // count vs quota
          }
          pushMatches(userId, toPersist);
        })
        .catch(() => {
          // Swallow — these stay "attempted" and simply show no score.
        })
        .finally(() => {
          pending.forEach((v) => {
            st.inFlight.delete(v.id);
            st.attempted.add(v.id);
          });
          st.running = Math.max(0, st.running - 1);
          setLoadingIds(new Set(st.inFlight));
          setTick((t) => t + 1); // free a slot → let the next batch start
        });
    };

    // Launch as many batches as concurrency + remaining quota allow, in one pass.
    let idx = 0;
    let launched = false;
    while (
      st.running < MAX_CONCURRENT &&
      budget > 0 &&
      idx < candidates.length
    ) {
      const size = Math.min(BATCH_SIZE, budget, candidates.length - idx);
      const batch = candidates.slice(idx, idx + size);
      idx += size;
      budget -= size;
      batch.forEach((v) => st.inFlight.add(v.id));
      setLoadingIds(new Set(st.inFlight));
      st.running += 1;
      launched = true;
      runBatch(batch);
    }
    if (launched) setTick((t) => t + 1); // reflect loading state immediately
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowIds, resumeContext, enabled, tick]);

  return loadingIds;
}
