// Run with Node 24's built-in TS support:  node --test src/lib/deck-supply.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  countSupply,
  decidePrefetch,
  pickRefillVariant,
  type SupplyCounts,
} from "./deck-supply.ts";
import type { HHVacancyItem } from "./hh/types.ts";
import type { MatchResult } from "./types.ts";

// Minimal vacancy stub — only `id` is read by the supply logic.
const v = (id: string): HHVacancyItem => ({ id }) as HHVacancyItem;
const m = (score: number): MatchResult => ({ score }) as MatchResult;

const noBudget = { canScoreMore: true, hasNextPage: true, isFetchingNextPage: false };

test("countSupply tallies usable / scored / unscored", () => {
  const items = [v("a"), v("b"), v("c"), v("d")];
  const matches: Record<string, MatchResult> = {
    a: m(90), // usable
    b: m(50), // usable (boundary)
    c: m(20), // scored but weak
    // d: unscored
  };
  const c = countSupply(items, matches);
  assert.deepEqual(c, { usableReady: 2, scored: 3, unscored: 1 });
});

test("countSupply handles score 0 as scored (not unscored)", () => {
  const c = countSupply([v("a")], { a: m(0) });
  assert.deepEqual(c, { usableReady: 0, scored: 1, unscored: 0 });
});

// --- decidePrefetch ---------------------------------------------------------

test("idle when no next page or already fetching", () => {
  const counts: SupplyCounts = { usableReady: 0, scored: 0, unscored: 0 };
  assert.equal(
    decidePrefetch({ counts, deckLength: 3, budgetUsed: 0, canScoreMore: true, hasNextPage: false, isFetchingNextPage: false }).fetch,
    false,
  );
  assert.equal(
    decidePrefetch({ counts, deckLength: 3, budgetUsed: 0, canScoreMore: true, hasNextPage: true, isFetchingNextPage: true }).fetch,
    false,
  );
});

test("safety refill fires on a near-empty buffer without consuming budget", () => {
  const counts: SupplyCounts = { usableReady: 9, scored: 9, unscored: 0 };
  const d = decidePrefetch({ counts, deckLength: 6, budgetUsed: 0, ...noBudget });
  assert.equal(d.fetch, true);
  assert.equal(d.consumeBudget, false); // plenty of usable cards → not a blind search
});

test("usable refill fires (and consumes budget) when good matches run low", () => {
  const counts: SupplyCounts = { usableReady: 1, scored: 3, unscored: 2 };
  const d = decidePrefetch({ counts, deckLength: 20, budgetUsed: 0, ...noBudget });
  assert.equal(d.fetch, true);
  assert.equal(d.consumeBudget, true);
});

test("no usable refill while a large unscored backlog awaits scoring", () => {
  const counts: SupplyCounts = { usableReady: 0, scored: 0, unscored: 20 }; // > BACKLOG_CAP
  const d = decidePrefetch({ counts, deckLength: 20, budgetUsed: 0, ...noBudget });
  assert.equal(d.fetch, false);
  assert.equal(d.exhaustBudget, false);
});

test("no usable refill when scoring quota is exhausted", () => {
  const counts: SupplyCounts = { usableReady: 0, scored: 5, unscored: 0 };
  const d = decidePrefetch({ counts, deckLength: 20, budgetUsed: 0, canScoreMore: false, hasNextPage: true, isFetchingNextPage: false });
  assert.equal(d.fetch, false);
  assert.equal(d.exhaustBudget, false); // wantUsable is false → don't flag exhaustion
});

test("budget spent → stop auto-fetching and signal exhaustion", () => {
  const counts: SupplyCounts = { usableReady: 0, scored: 5, unscored: 0 };
  const d = decidePrefetch({ counts, deckLength: 20, budgetUsed: 2, ...noBudget });
  assert.equal(d.fetch, false);
  assert.equal(d.exhaustBudget, true);
});

test("budget spent but buffer near-empty → still safety-refill", () => {
  const counts: SupplyCounts = { usableReady: 0, scored: 5, unscored: 0 };
  const d = decidePrefetch({ counts, deckLength: 5, budgetUsed: 2, ...noBudget });
  assert.equal(d.fetch, true);
  assert.equal(d.consumeBudget, false);
});

// --- pickRefillVariant ------------------------------------------------------

const base = {
  hasTop: true,
  isFetchingNextPage: false,
  scoring: false,
  hasNextPage: true,
  canScoreMore: true,
  autoExhausted: false,
};

test("no banner when the top card is a good match", () => {
  assert.equal(pickRefillVariant({ ...base, topScore: 80, autoExhausted: true }), null);
});

test("no banner while fetching or scoring (anti-flicker)", () => {
  assert.equal(pickRefillVariant({ ...base, topScore: 10, autoExhausted: true, isFetchingNextPage: true }), null);
  assert.equal(pickRefillVariant({ ...base, topScore: 10, autoExhausted: true, scoring: true }), null);
});

test("no banner with no cards at all", () => {
  assert.equal(pickRefillVariant({ ...base, hasTop: false, topScore: undefined }), null);
});

test("exhausted variant when hh.ru has no more pages", () => {
  assert.equal(pickRefillVariant({ ...base, topScore: 10, hasNextPage: false }), "exhausted");
});

test("outOfQuota variant when more pages exist but scoring quota is gone", () => {
  assert.equal(pickRefillVariant({ ...base, topScore: 10, canScoreMore: false }), "outOfQuota");
});

test("loadMore variant when auto-search gave up but inventory remains", () => {
  assert.equal(pickRefillVariant({ ...base, topScore: 10, autoExhausted: true }), "loadMore");
});

test("weak top but auto-search still has budget → no banner (let it search)", () => {
  assert.equal(pickRefillVariant({ ...base, topScore: 10, autoExhausted: false }), null);
});

test("unscored top card counts as weak", () => {
  assert.equal(pickRefillVariant({ ...base, topScore: undefined, autoExhausted: true }), "loadMore");
});
