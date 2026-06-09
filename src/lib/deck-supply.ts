// Pure decision logic for keeping the swipe deck stocked with *scored, usable*
// matches. Kept framework-free (no React, no network) so it can be unit-tested
// in isolation — see deck-supply.test.ts. The home feed (src/app/page.tsx)
// wires these into React state/effects.
import type { HHVacancyItem } from "@/lib/hh/types";
import type { MatchResult } from "@/lib/types";

// --- Tuning -----------------------------------------------------------------
// "Usable" = a match score worth surfacing (matches the ≥50 "Среднее" tier in
// match-style.ts). hh.ru pages are free to fetch; the paid part (AI scoring) is
// quota-capped, so we only pull fresh inventory while we can still score it and
// scoring hasn't fallen behind.
export const USABLE_SCORE = 50; // score ≥ this counts as a "good" match
export const READY_MIN = 5; // below this many usable cards ahead → fetch next page
export const BACKLOG_CAP = 14; // don't fetch more while this many cards await scoring
export const AUTO_PAGE_BUDGET = 2; // blind auto-fetches with no new usable match before we ask the user

export type RefillVariant = "loadMore" | "outOfQuota" | "exhausted";

export interface SupplyCounts {
  /** Unswiped cards scored ≥ USABLE_SCORE. */
  usableReady: number;
  /** Unswiped cards with any score. */
  scored: number;
  /** Unswiped cards still awaiting (or never getting) a score. */
  unscored: number;
}

/** Tally the current deck supply by match-score status. */
export function countSupply(
  items: HHVacancyItem[],
  matches: Record<string, MatchResult>,
): SupplyCounts {
  let usableReady = 0;
  let scored = 0;
  let unscored = 0;
  for (const v of items) {
    const s = matches[v.id]?.score;
    if (s == null) unscored++;
    else {
      scored++;
      if (s >= USABLE_SCORE) usableReady++;
    }
  }
  return { usableReady, scored, unscored };
}

export interface PrefetchInput {
  counts: SupplyCounts;
  deckLength: number;
  /** AI analysis quota still available. */
  canScoreMore: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  /** Blind auto-fetches already spent on the current search. */
  budgetUsed: number;
}

export interface PrefetchDecision {
  /** Fetch the next hh.ru page now. */
  fetch: boolean;
  /** This fetch is a "blind search" and should count against the budget. */
  consumeBudget: boolean;
  /** Auto-search gave up (budget spent); hand control to the user. */
  exhaustBudget: boolean;
}

const IDLE: PrefetchDecision = {
  fetch: false,
  consumeBudget: false,
  exhaustBudget: false,
};

/**
 * Decide whether to pull the next hh.ru page. Two independent triggers:
 *  - safety refill: the raw buffer is about to empty (always allowed, free);
 *  - usable refill: too few good matches ahead, scoring isn't backlogged, we
 *    can still score, and the blind-search budget isn't spent.
 */
export function decidePrefetch(i: PrefetchInput): PrefetchDecision {
  if (!i.hasNextPage || i.isFetchingNextPage) return IDLE;

  const lowRawBuffer = i.deckLength <= 6;
  const wantUsable =
    i.canScoreMore &&
    i.counts.usableReady < READY_MIN &&
    i.counts.unscored < BACKLOG_CAP;
  const budgetLeft = i.budgetUsed < AUTO_PAGE_BUDGET;
  const blindFetch = wantUsable && budgetLeft;

  if (lowRawBuffer || blindFetch) {
    return { fetch: true, consumeBudget: blindFetch, exhaustBudget: false };
  }
  if (wantUsable && !budgetLeft) {
    return { fetch: false, consumeBudget: false, exhaustBudget: true };
  }
  return IDLE;
}

export interface RefillInput {
  /** Score of the best remaining (top, post-sort) card. */
  topScore: number | null | undefined;
  /** Whether there is a top card at all. */
  hasTop: boolean;
  isFetchingNextPage: boolean;
  /** A scoring batch is currently in flight. */
  scoring: boolean;
  hasNextPage: boolean;
  canScoreMore: boolean;
  autoExhausted: boolean;
}

/**
 * Which refill CTA (if any) to show above the deck. Only when the best
 * remaining card is weak AND we're idle (not mid fetch/score) — so it never
 * flickers while a fresh batch is still being pulled and scored.
 */
export function pickRefillVariant(i: RefillInput): RefillVariant | null {
  if (!i.hasTop) return null;
  const onlyWeakLeft = i.topScore == null || i.topScore < USABLE_SCORE;
  const settling = i.isFetchingNextPage || i.scoring;
  if (!onlyWeakLeft || settling) return null;
  if (!i.hasNextPage) return "exhausted"; // hh.ru has nothing more for these filters
  if (!i.canScoreMore) return "outOfQuota"; // can't score new pages → nudge to Pro
  if (i.autoExhausted) return "loadMore"; // more inventory exists, ask before spending
  return null;
}
