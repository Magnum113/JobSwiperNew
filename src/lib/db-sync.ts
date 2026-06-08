// Browser-side sync layer: talks to our /api/db routes (which use Supabase).
// The ONLY thing kept in localStorage is the anonymous user id.
import type { HHVacancyItem } from "./hh/types";
import type {
  Filters,
  MatchResult,
  ResumeProfile,
  LikedItem,
  CustomLetter,
  AsyncStatus,
} from "./types";

const USER_KEY = "jobswiper-user-id";

/** Stable anonymous device id (the only value left in localStorage). */
export function getOrCreateUserId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(USER_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `u_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(USER_KEY, id);
  }
  return id;
}

export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}

export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const res = await fetch("/api/auth/session", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { user?: AuthUser | null };
    return data.user ?? null;
  } catch {
    return null;
  }
}

export async function mergeAnonymousState(sourceUserId: string): Promise<void> {
  if (!sourceUserId) return;
  try {
    await fetch("/api/db/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceUserId }),
    });
  } catch (e) {
    console.warn("db-merge error", e);
  }
}

export interface RemoteState {
  profile: ResumeProfile | null;
  filters: Filters | null;
  seen: Record<string, "liked" | "passed">;
  matches: Record<string, MatchResult>;
  liked: Record<string, LikedItem>;
  customLetters: Record<string, CustomLetter>;
}

async function send(method: "POST" | "PUT", path: string, body: unknown) {
  try {
    const res = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) console.warn("db-sync", path, res.status);
  } catch (e) {
    console.warn("db-sync error", path, e);
  }
}

export async function pullState(userId: string): Promise<RemoteState | null> {
  if (!userId) return null;
  // Retry a couple of times — the very first request can be slow/cold in dev.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(
        `/api/db/state?userId=${encodeURIComponent(userId)}`,
      );
      if (res.ok) return (await res.json()) as RemoteState;
    } catch {
      // fall through to retry
    }
    await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
  }
  return null;
}

/* --------------------------- fire-and-forget pushes ----------------------- */

export function pushProfile(
  userId: string,
  profile: ResumeProfile | null,
  filters?: Filters,
) {
  if (!userId) return;
  void send("PUT", "/api/db/profile", { userId, profile, filters });
}

export function pushFilters(userId: string, filters: Filters) {
  if (!userId) return;
  void send("PUT", "/api/db/profile", { userId, filters });
}

export function pushSwipe(
  userId: string,
  vacancy: HHVacancyItem,
  direction: "liked" | "passed",
  match?: MatchResult,
) {
  if (!userId) return;
  void send("POST", "/api/db/swipe", { userId, vacancy, direction, match });
}

export function removeSwipe(userId: string, vacancyId: string) {
  if (!userId) return;
  void send("POST", "/api/db/swipe", { userId, remove: true, vacancyId });
}

export function pushMatches(
  userId: string,
  items: { vacancy: HHVacancyItem; match: MatchResult }[],
) {
  if (!userId || items.length === 0) return;
  void send("POST", "/api/db/matches", { userId, items });
}

export interface CoverLetterSync {
  id: string;
  kind: "liked" | "custom";
  vacancy?: HHVacancyItem;
  vacancyId?: string | null;
  title?: string;
  company?: string;
  vacancyText?: string;
  letterText?: string;
  status: AsyncStatus;
}

export function pushCoverLetter(userId: string, payload: CoverLetterSync) {
  if (!userId) return;
  void send("POST", "/api/db/cover-letter", { userId, ...payload });
}

export function removeCoverLetter(userId: string, id: string) {
  if (!userId) return;
  void send("POST", "/api/db/cover-letter", { userId, remove: true, id });
}

export function resetSwipesRemote(userId: string) {
  if (!userId) return;
  void send("POST", "/api/db/reset", { userId });
}
