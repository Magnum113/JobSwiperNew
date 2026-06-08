import { create } from "zustand";
import type {
  Filters,
  LikedItem,
  MatchResult,
  ResumeProfile,
  CoverLetterState,
  CustomLetter,
} from "@/lib/types";
import type { HHVacancyItem } from "@/lib/hh/types";
import { DEFAULT_AREA, DEFAULT_ORDER_BY } from "@/lib/hh/dictionaries";
import {
  type AuthUser,
  type RemoteState,
  pushProfile,
  pushFilters,
  pushSwipe,
  removeSwipe,
  pushCoverLetter,
  removeCoverLetter,
  resetSwipesRemote,
} from "@/lib/db-sync";

export const DEFAULT_FILTERS: Filters = {
  text: "",
  area: DEFAULT_AREA,
  experience: [],
  employment: [],
  schedule: [],
  salary: undefined,
  onlyWithSalary: false,
  orderBy: DEFAULT_ORDER_BY,
};

type SeenMap = Record<string, "liked" | "passed">;

function newId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `cl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

interface AppState {
  /** Anonymous device id (persisted as the only localStorage value). */
  userId: string;
  setUserId: (id: string) => void;

  authUser: AuthUser | null;
  authChecked: boolean;
  setAuthUser: (user: AuthUser | null) => void;
  setAuthChecked: (v: boolean) => void;

  hydrated: boolean;
  setHydrated: (v: boolean) => void;
  /** Replace local state with what was loaded from Supabase. */
  hydrateFromServer: (state: RemoteState) => void;

  profile: ResumeProfile | null;
  setProfile: (p: ResumeProfile) => void;
  clearProfile: () => void;

  filters: Filters;
  setFilters: (patch: Partial<Filters>) => void;
  resetFilters: () => void;

  seen: SeenMap;

  liked: Record<string, LikedItem>;
  like: (vacancy: HHVacancyItem, match?: MatchResult) => void;
  pass: (vacancy: HHVacancyItem) => void;
  removeLiked: (vacancyId: string) => void;

  matches: Record<string, MatchResult>;
  setMatch: (vacancyId: string, match: MatchResult) => void;
  setMatches: (entries: Record<string, MatchResult>) => void;

  setCoverLetter: (vacancyId: string, patch: Partial<CoverLetterState>) => void;

  customLetters: Record<string, CustomLetter>;
  addCustomLetter: (data: {
    title: string;
    company: string;
    vacancyText: string;
  }) => string;
  setCustomLetterState: (id: string, patch: Partial<CoverLetterState>) => void;
  removeCustomLetter: (id: string) => void;

  resetSwipes: () => void;
}

export const useAppStore = create<AppState>()((set, get) => ({
  userId: "",
  setUserId: (id) => set({ userId: id }),

  authUser: null,
  authChecked: false,
  setAuthUser: (user) => set({ authUser: user }),
  setAuthChecked: (v) => set({ authChecked: v }),

  hydrated: false,
  setHydrated: (v) => set({ hydrated: v }),
  hydrateFromServer: (s) =>
    set({
      profile: s.profile,
      filters: s.filters ?? {
        ...DEFAULT_FILTERS,
        text: s.profile?.title ?? "",
      },
      seen: s.seen ?? {},
      matches: s.matches ?? {},
      liked: s.liked ?? {},
      customLetters: s.customLetters ?? {},
    }),

  profile: null,
  setProfile: (p) => {
    set((state) => ({
      profile: p,
      matches: {},
      filters: {
        ...state.filters,
        text: p.title || state.filters.text,
        experience:
          state.filters.experience.length === 0 && p.experienceId
            ? [p.experienceId]
            : state.filters.experience,
      },
    }));
    const { userId, filters } = get();
    pushProfile(userId, p, filters);
  },
  clearProfile: () => {
    set({ profile: null, matches: {} });
    pushProfile(get().userId, null);
  },

  filters: DEFAULT_FILTERS,
  setFilters: (patch) => {
    set((state) => ({ filters: { ...state.filters, ...patch } }));
    pushFilters(get().userId, get().filters);
  },
  resetFilters: () => {
    set((state) => ({
      filters: { ...DEFAULT_FILTERS, text: state.profile?.title ?? "" },
    }));
    pushFilters(get().userId, get().filters);
  },

  seen: {},
  liked: {},
  like: (vacancy, match) => {
    const cur = get();
    if (cur.liked[vacancy.id]) return;
    const effMatch = match ?? cur.matches[vacancy.id];
    set((state) => ({
      liked: {
        ...state.liked,
        [vacancy.id]: {
          vacancy,
          match: effMatch,
          coverLetter: { text: "", status: "idle", createdAt: 0 },
          likedAt: Date.now(),
        },
      },
      seen: { ...state.seen, [vacancy.id]: "liked" },
    }));
    pushSwipe(cur.userId, vacancy, "liked", effMatch);
  },
  pass: (vacancy) => {
    set((state) => ({
      seen: { ...state.seen, [vacancy.id]: "passed" },
    }));
    pushSwipe(get().userId, vacancy, "passed");
  },
  removeLiked: (vacancyId) => {
    set((state) => {
      const liked = { ...state.liked };
      delete liked[vacancyId];
      const seen = { ...state.seen };
      delete seen[vacancyId];
      return { liked, seen };
    });
    removeSwipe(get().userId, vacancyId);
  },

  matches: {},
  setMatch: (vacancyId, match) =>
    set((state) => ({ matches: { ...state.matches, [vacancyId]: match } })),
  setMatches: (entries) =>
    set((state) => ({ matches: { ...state.matches, ...entries } })),

  setCoverLetter: (vacancyId, patch) =>
    set((state) => {
      const item = state.liked[vacancyId];
      if (!item) return state;
      return {
        liked: {
          ...state.liked,
          [vacancyId]: {
            ...item,
            coverLetter: { ...item.coverLetter, ...patch },
          },
        },
      };
    }),

  customLetters: {},
  addCustomLetter: ({ title, company, vacancyText }) => {
    const id = newId();
    set((state) => ({
      customLetters: {
        ...state.customLetters,
        [id]: {
          id,
          title: title.trim(),
          company: company.trim(),
          vacancyText: vacancyText.trim(),
          letter: { text: "", status: "idle", createdAt: 0 },
          createdAt: Date.now(),
        },
      },
    }));
    pushCoverLetter(get().userId, {
      id,
      kind: "custom",
      title: title.trim(),
      company: company.trim(),
      vacancyText: vacancyText.trim(),
      status: "idle",
    });
    return id;
  },
  setCustomLetterState: (id, patch) =>
    set((state) => {
      const item = state.customLetters[id];
      if (!item) return state;
      return {
        customLetters: {
          ...state.customLetters,
          [id]: { ...item, letter: { ...item.letter, ...patch } },
        },
      };
    }),
  removeCustomLetter: (id) => {
    set((state) => {
      const next = { ...state.customLetters };
      delete next[id];
      return { customLetters: next };
    });
    removeCoverLetter(get().userId, id);
  },

  resetSwipes: () => {
    set({ seen: {}, liked: {} });
    resetSwipesRemote(get().userId);
  },
}));
