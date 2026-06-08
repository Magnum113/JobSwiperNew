import { postCoverLetter, postCustomCoverLetter } from "./api-client";
import { buildResumeContext } from "./resume";
import { useAppStore } from "./store/use-app-store";
import { pushCoverLetter } from "./db-sync";

// Tracks letters actually being generated *right now* in this tab. Persisted
// "loading" states from a previous session won't be here, so they can be retried.
const inFlight = new Set<string>();

export function isGeneratingCoverLetter(vacancyId: string): boolean {
  return inFlight.has(vacancyId);
}

/**
 * Generates (or regenerates) the AI cover letter for a liked vacancy, writing
 * its lifecycle to both the local store and Supabase.
 */
export async function generateCoverLetter(vacancyId: string): Promise<void> {
  if (inFlight.has(vacancyId)) return;
  const store = useAppStore.getState();
  const item = store.liked[vacancyId];
  const profile = store.profile;
  const userId = store.userId;
  if (!item || !profile) return;

  inFlight.add(vacancyId);
  store.setCoverLetter(vacancyId, { status: "loading" });
  pushCoverLetter(userId, {
    id: vacancyId,
    kind: "liked",
    vacancy: item.vacancy,
    vacancyId,
    status: "loading",
  });
  try {
    const text = await postCoverLetter(
      buildResumeContext(profile),
      item.vacancy,
    );
    useAppStore.getState().setCoverLetter(vacancyId, {
      text,
      status: "done",
      createdAt: Date.now(),
    });
    pushCoverLetter(userId, {
      id: vacancyId,
      kind: "liked",
      vacancy: item.vacancy,
      vacancyId,
      letterText: text,
      status: "done",
    });
  } catch {
    useAppStore.getState().setCoverLetter(vacancyId, { status: "error" });
    pushCoverLetter(userId, {
      id: vacancyId,
      kind: "liked",
      vacancy: item.vacancy,
      vacancyId,
      status: "error",
    });
  } finally {
    inFlight.delete(vacancyId);
  }
}

/** Generates the cover letter for a manually pasted (non-hh.ru) vacancy. */
export async function generateCustomLetter(id: string): Promise<void> {
  if (inFlight.has(id)) return;
  const store = useAppStore.getState();
  const item = store.customLetters[id];
  const profile = store.profile;
  const userId = store.userId;
  if (!item || !profile) return;

  const base = {
    id,
    kind: "custom" as const,
    title: item.title,
    company: item.company,
    vacancyText: item.vacancyText,
  };

  inFlight.add(id);
  store.setCustomLetterState(id, { status: "loading" });
  pushCoverLetter(userId, { ...base, status: "loading" });
  try {
    const text = await postCustomCoverLetter(buildResumeContext(profile), {
      name: item.title || "Вакансия",
      company: item.company,
      description: item.vacancyText,
    });
    useAppStore.getState().setCustomLetterState(id, {
      text,
      status: "done",
      createdAt: Date.now(),
    });
    pushCoverLetter(userId, { ...base, letterText: text, status: "done" });
  } catch {
    useAppStore.getState().setCustomLetterState(id, { status: "error" });
    pushCoverLetter(userId, { ...base, status: "error" });
  } finally {
    inFlight.delete(id);
  }
}
