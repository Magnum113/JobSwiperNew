import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
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

interface AppState {
  hydrated: boolean;
  setHydrated: (v: boolean) => void;

  profile: ResumeProfile | null;
  setProfile: (p: ResumeProfile) => void;
  clearProfile: () => void;

  filters: Filters;
  setFilters: (patch: Partial<Filters>) => void;
  resetFilters: () => void;

  /** Vacancies the user acted on (to exclude from the deck). */
  seen: SeenMap;

  /** Liked vacancies keyed by id. */
  liked: Record<string, LikedItem>;
  like: (vacancy: HHVacancyItem, match?: MatchResult) => void;
  pass: (vacancyId: string) => void;
  removeLiked: (vacancyId: string) => void;

  /** Cached AI match results keyed by vacancy id (reset when resume changes). */
  matches: Record<string, MatchResult>;
  setMatch: (vacancyId: string, match: MatchResult) => void;
  setMatches: (entries: Record<string, MatchResult>) => void;

  setCoverLetter: (vacancyId: string, patch: Partial<CoverLetterState>) => void;

  /** Cover letters generated for manually pasted (non-hh.ru) vacancies. */
  customLetters: Record<string, CustomLetter>;
  addCustomLetter: (data: {
    title: string;
    company: string;
    vacancyText: string;
  }) => string;
  setCustomLetterState: (
    id: string,
    patch: Partial<CoverLetterState>,
  ) => void;
  removeCustomLetter: (id: string) => void;

  resetSwipes: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      hydrated: false,
      setHydrated: (v) => set({ hydrated: v }),

      profile: null,
      setProfile: (p) =>
        set((state) => ({
          profile: p,
          // New resume → previous match scores are stale.
          matches: {},
          // Seed the search query with the detected profession.
          filters: {
            ...state.filters,
            text: p.title || state.filters.text,
            experience:
              state.filters.experience.length === 0 && p.experienceId
                ? [p.experienceId]
                : state.filters.experience,
          },
        })),
      clearProfile: () => set({ profile: null, matches: {} }),

      filters: DEFAULT_FILTERS,
      setFilters: (patch) =>
        set((state) => ({ filters: { ...state.filters, ...patch } })),
      resetFilters: () =>
        set((state) => ({
          filters: { ...DEFAULT_FILTERS, text: state.profile?.title ?? "" },
        })),

      seen: {},
      liked: {},
      like: (vacancy, match) =>
        set((state) => {
          if (state.liked[vacancy.id]) return state;
          const item: LikedItem = {
            vacancy,
            match: match ?? state.matches[vacancy.id],
            coverLetter: { text: "", status: "idle", createdAt: 0 },
            likedAt: Date.now(),
          };
          return {
            liked: { ...state.liked, [vacancy.id]: item },
            seen: { ...state.seen, [vacancy.id]: "liked" },
          };
        }),
      pass: (vacancyId) =>
        set((state) => ({
          seen: { ...state.seen, [vacancyId]: "passed" },
        })),
      removeLiked: (vacancyId) =>
        set((state) => {
          const liked = { ...state.liked };
          delete liked[vacancyId];
          const seen = { ...state.seen };
          delete seen[vacancyId];
          return { liked, seen };
        }),

      matches: {},
      setMatch: (vacancyId, match) =>
        set((state) => ({
          matches: { ...state.matches, [vacancyId]: match },
        })),
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
        const id =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `cl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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
      removeCustomLetter: (id) =>
        set((state) => {
          const next = { ...state.customLetters };
          delete next[id];
          return { customLetters: next };
        }),

      resetSwipes: () => set({ seen: {}, liked: {} }),
    }),
    {
      name: "jobswiper-store",
      version: 1,
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? window.localStorage
          : (undefined as unknown as Storage),
      ),
      partialize: (state) => ({
        profile: state.profile,
        filters: state.filters,
        seen: state.seen,
        liked: state.liked,
        matches: state.matches,
        customLetters: state.customLetters,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
