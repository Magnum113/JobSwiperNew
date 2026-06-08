import "server-only";
import { getSupabase } from "./server";
import type { HHVacancyItem } from "@/lib/hh/types";
import type {
  ResumeProfile,
  Filters,
  MatchResult,
  LikedItem,
  CustomLetter,
  CoverLetterState,
  AsyncStatus,
} from "@/lib/types";

/* ------------------------------- mapping ---------------------------------- */

function vacancyRow(v: HHVacancyItem) {
  return {
    id: v.id,
    name: v.name ?? "",
    employer_name: v.employer?.name ?? null,
    area_name: v.area?.name ?? null,
    salary_from: v.salary?.from ?? null,
    salary_to: v.salary?.to ?? null,
    salary_currency: v.salary?.currency ?? null,
    alternate_url: v.alternate_url ?? null,
    apply_alternate_url: v.apply_alternate_url ?? null,
    data: v,
  };
}

const toMs = (iso: string | null): number =>
  iso ? new Date(iso).getTime() : 0;

/* ------------------------------- user row --------------------------------- */

export async function ensureUser(userId: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from("users")
    .upsert({ id: userId }, { onConflict: "id", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}

export async function saveProfile(
  userId: string,
  profile: ResumeProfile | null,
): Promise<void> {
  const sb = getSupabase();
  await ensureUser(userId);
  const patch = profile
    ? {
        resume_text: profile.rawText,
        resume_title: profile.title,
        resume_skills: profile.skills ?? [],
        resume_seniority: profile.seniority,
        resume_summary: profile.summary,
        resume_experience_id: profile.experienceId,
        resume_updated_at: new Date(profile.updatedAt || Date.now()).toISOString(),
      }
    : {
        resume_text: null,
        resume_title: null,
        resume_skills: [],
        resume_seniority: null,
        resume_summary: null,
        resume_experience_id: null,
        resume_updated_at: null,
      };
  const { error } = await sb.from("users").update(patch).eq("id", userId);
  if (error) throw new Error(error.message);

  // Resume changed → previously computed deck scores are stale. Wipe them, but
  // keep scores for already-liked vacancies (they reflect the moment of liking).
  await clearDeckMatches(userId);
}

/** Delete cached match scores except for vacancies the user has liked. */
export async function clearDeckMatches(userId: string): Promise<void> {
  const sb = getSupabase();
  const { data } = await sb
    .from("swipes")
    .select("vacancy_id")
    .eq("user_id", userId)
    .eq("direction", "liked");
  const likedIds = (data ?? []).map((r) => r.vacancy_id as string);
  let q = sb.from("match_scores").delete().eq("user_id", userId);
  if (likedIds.length > 0) {
    q = q.not("vacancy_id", "in", `(${likedIds.join(",")})`);
  }
  const { error } = await q;
  if (error) throw new Error(error.message);
}

export async function saveFilters(
  userId: string,
  filters: Filters,
): Promise<void> {
  const sb = getSupabase();
  await ensureUser(userId);
  const { error } = await sb
    .from("users")
    .update({ filters })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

/* ------------------------------- vacancies -------------------------------- */

export async function upsertVacancies(
  vacancies: HHVacancyItem[],
): Promise<void> {
  if (vacancies.length === 0) return;
  const sb = getSupabase();
  const { error } = await sb
    .from("vacancies")
    .upsert(vacancies.map(vacancyRow), { onConflict: "id" });
  if (error) throw new Error(error.message);
}

/* -------------------------------- swipes ---------------------------------- */

export async function recordSwipe(
  userId: string,
  vacancy: HHVacancyItem,
  direction: "liked" | "passed",
  match?: MatchResult,
): Promise<void> {
  const sb = getSupabase();
  await ensureUser(userId);
  await upsertVacancies([vacancy]);

  const { error: swErr } = await sb
    .from("swipes")
    .upsert(
      { user_id: userId, vacancy_id: vacancy.id, direction },
      { onConflict: "user_id,vacancy_id" },
    );
  if (swErr) throw new Error(swErr.message);

  if (match) {
    await saveMatches(userId, [{ vacancy, match }]);
  }
}

export async function removeSwipe(
  userId: string,
  vacancyId: string,
): Promise<void> {
  const sb = getSupabase();
  await sb.from("swipes").delete().eq("user_id", userId).eq("vacancy_id", vacancyId);
  await sb
    .from("cover_letters")
    .delete()
    .eq("user_id", userId)
    .eq("id", vacancyId)
    .eq("kind", "liked");
}

export async function resetSwipes(userId: string): Promise<void> {
  const sb = getSupabase();
  await sb.from("swipes").delete().eq("user_id", userId);
  await sb
    .from("cover_letters")
    .delete()
    .eq("user_id", userId)
    .eq("kind", "liked");
}

/* --------------------------------- matches -------------------------------- */

export async function saveMatches(
  userId: string,
  items: { vacancy: HHVacancyItem; match: MatchResult }[],
): Promise<void> {
  if (items.length === 0) return;
  const sb = getSupabase();
  await ensureUser(userId);
  await upsertVacancies(items.map((i) => i.vacancy));

  const rows = items.map(({ vacancy, match }) => ({
    user_id: userId,
    vacancy_id: vacancy.id,
    score: match.score,
    strengths: match.strengths ?? [],
    gaps: match.gaps ?? [],
    summary: match.summary ?? "",
  }));
  const { error } = await sb
    .from("match_scores")
    .upsert(rows, { onConflict: "user_id,vacancy_id" });
  if (error) throw new Error(error.message);
}

/* ------------------------------ cover letters ----------------------------- */

export interface CoverLetterPayload {
  id: string;
  kind: "liked" | "custom";
  vacancy?: HHVacancyItem; // for liked
  vacancyId?: string | null;
  title?: string;
  company?: string;
  vacancyText?: string;
  letterText?: string;
  status: AsyncStatus;
}

export async function saveCoverLetter(
  userId: string,
  p: CoverLetterPayload,
): Promise<void> {
  const sb = getSupabase();
  await ensureUser(userId);
  if (p.kind === "liked" && p.vacancy) {
    await upsertVacancies([p.vacancy]);
  }
  const row = {
    user_id: userId,
    id: p.id,
    kind: p.kind,
    vacancy_id: p.kind === "liked" ? (p.vacancyId ?? p.id) : null,
    title: p.title ?? null,
    company: p.company ?? null,
    vacancy_text: p.vacancyText ?? null,
    letter_text: p.letterText ?? null,
    status: p.status,
  };
  const { error } = await sb
    .from("cover_letters")
    .upsert(row, { onConflict: "user_id,id" });
  if (error) throw new Error(error.message);
}

export async function removeCoverLetter(
  userId: string,
  id: string,
): Promise<void> {
  const sb = getSupabase();
  await sb.from("cover_letters").delete().eq("user_id", userId).eq("id", id);
}

/* ------------------------------ load full state --------------------------- */

export interface LoadedState {
  profile: ResumeProfile | null;
  filters: Filters | null;
  seen: Record<string, "liked" | "passed">;
  matches: Record<string, MatchResult>;
  liked: Record<string, LikedItem>;
  customLetters: Record<string, CustomLetter>;
}

export async function loadState(userId: string): Promise<LoadedState> {
  const sb = getSupabase();
  await ensureUser(userId);

  const [userRes, swipesRes, matchesRes, lettersRes] = await Promise.all([
    sb.from("users").select("*").eq("id", userId).maybeSingle(),
    sb.from("swipes").select("*").eq("user_id", userId),
    sb.from("match_scores").select("*").eq("user_id", userId),
    sb.from("cover_letters").select("*").eq("user_id", userId),
  ]);

  // Profile
  const u = userRes.data;
  const profile: ResumeProfile | null =
    u && u.resume_text
      ? {
          rawText: u.resume_text,
          title: u.resume_title ?? "",
          skills: Array.isArray(u.resume_skills) ? u.resume_skills : [],
          seniority: u.resume_seniority ?? "",
          summary: u.resume_summary ?? "",
          experienceId: u.resume_experience_id ?? "between1And3",
          updatedAt: toMs(u.resume_updated_at),
        }
      : null;

  const filters: Filters | null =
    u && u.filters && Object.keys(u.filters).length > 0
      ? (u.filters as Filters)
      : null;

  // Matches
  const matches: Record<string, MatchResult> = {};
  for (const m of matchesRes.data ?? []) {
    matches[m.vacancy_id] = {
      score: m.score,
      strengths: Array.isArray(m.strengths) ? m.strengths : [],
      gaps: Array.isArray(m.gaps) ? m.gaps : [],
      summary: m.summary ?? "",
    };
  }

  // Cover letters → split liked / custom
  const likedLetters: Record<string, CoverLetterState> = {};
  const customLetters: Record<string, CustomLetter> = {};
  for (const l of lettersRes.data ?? []) {
    const letter: CoverLetterState = {
      text: l.letter_text ?? "",
      status: (l.status as AsyncStatus) ?? "idle",
      createdAt: toMs(l.created_at),
    };
    if (l.kind === "liked") {
      likedLetters[l.id] = letter;
    } else {
      customLetters[l.id] = {
        id: l.id,
        title: l.title ?? "",
        company: l.company ?? "",
        vacancyText: l.vacancy_text ?? "",
        letter,
        createdAt: toMs(l.created_at),
      };
    }
  }

  // Swipes → seen + liked
  const seen: Record<string, "liked" | "passed"> = {};
  const likedIds: string[] = [];
  const swipeAt: Record<string, number> = {};
  for (const s of swipesRes.data ?? []) {
    seen[s.vacancy_id] = s.direction;
    swipeAt[s.vacancy_id] = toMs(s.created_at);
    if (s.direction === "liked") likedIds.push(s.vacancy_id);
  }

  // Fetch the snapshots of liked vacancies
  const liked: Record<string, LikedItem> = {};
  if (likedIds.length > 0) {
    const vacRes = await sb
      .from("vacancies")
      .select("id, data")
      .in("id", likedIds);
    for (const row of vacRes.data ?? []) {
      const vacancy = row.data as HHVacancyItem;
      liked[row.id] = {
        vacancy,
        match: matches[row.id],
        coverLetter:
          likedLetters[row.id] ?? { text: "", status: "idle", createdAt: 0 },
        likedAt: swipeAt[row.id] ?? 0,
      };
    }
  }

  return { profile, filters, seen, matches, liked, customLetters };
}
