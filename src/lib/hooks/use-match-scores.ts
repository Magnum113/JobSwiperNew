"use client";
import { useEffect, useRef, useState } from "react";
import { postMatch } from "@/lib/api-client";
import { pushMatches } from "@/lib/db-sync";
import { useAppStore } from "@/lib/store/use-app-store";
import { getFreeLimits } from "@/lib/plans";
import type { HHVacancyItem } from "@/lib/hh/types";
import type { MatchResult } from "@/lib/types";

const BATCH_SIZE = 6;
const WINDOW = 12; // only pre-score the cards the user is about to reach

/**
 * Lazily computes AI match scores for the top of the deck, one batch at a time
 * (to keep token usage and rate limits in check), caching results in the store.
 * Each vacancy is attempted at most once per resume to avoid burning quota.
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
  itemsRef.current = items;

  const stateRef = useRef({
    ctx: "",
    attempted: new Set<string>(),
    inFlight: new Set<string>(),
  });
  const [tick, setTick] = useState(0);

  const windowIds = items
    .slice(0, WINDOW)
    .map((v) => v.id)
    .join(",");

  useEffect(() => {
    const st = stateRef.current;
    // Reset attempt tracking when the resume changes.
    if (st.ctx !== resumeContext) {
      st.ctx = resumeContext;
      st.attempted = new Set();
      st.inFlight = new Set();
    }
    if (!enabled || !resumeContext) return;
    if (st.inFlight.size > 0) return; // one batch at a time

    // Stop scoring once the account's analysis quota is used up.
    const { quota, proBonusClaimed, consumeAnalyses } = useAppStore.getState();
    const analysesLeft =
      getFreeLimits(proBonusClaimed).analyses - quota.analysesUsed;
    if (analysesLeft <= 0) return;

    const pending = itemsRef.current
      .slice(0, WINDOW)
      .filter(
        (v) =>
          matches[v.id] == null &&
          !st.attempted.has(v.id) &&
          !st.inFlight.has(v.id),
      )
      .slice(0, Math.min(BATCH_SIZE, analysesLeft));

    if (pending.length === 0) return;

    pending.forEach((v) => st.inFlight.add(v.id));
    setTick((t) => t + 1); // reflect loading state

    postMatch(resumeContext, pending)
      .then((results) => {
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
          consumeAnalyses(scored); // count successful analyses against quota
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
        setTick((t) => t + 1); // trigger the next batch
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowIds, resumeContext, enabled, tick]);

  const loadingIds = new Set(stateRef.current.inFlight);
  return loadingIds;
}
