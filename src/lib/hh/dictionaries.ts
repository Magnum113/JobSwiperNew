// Static copies of the hh.ru dictionary values used by the filter UI.
// Verified against GET https://api.hh.ru/dictionaries (2026-06).
// HH warns these can change, so the full city list is fetched live via /api/areas;
// these constants give us instant, dependency-free filter options.

export interface DictOption {
  id: string;
  name: string;
}

export const EXPERIENCE_OPTIONS: DictOption[] = [
  { id: "noExperience", name: "Нет опыта" },
  { id: "between1And3", name: "От 1 года до 3 лет" },
  { id: "between3And6", name: "От 3 до 6 лет" },
  { id: "moreThan6", name: "Более 6 лет" },
];

export const EMPLOYMENT_OPTIONS: DictOption[] = [
  { id: "full", name: "Полная занятость" },
  { id: "part", name: "Частичная занятость" },
  { id: "project", name: "Проектная работа" },
  { id: "probation", name: "Стажировка" },
  { id: "volunteer", name: "Волонтёрство" },
];

export const SCHEDULE_OPTIONS: DictOption[] = [
  { id: "remote", name: "Удалённо" },
  { id: "fullDay", name: "Полный день" },
  { id: "flexible", name: "Гибкий график" },
  { id: "shift", name: "Сменный график" },
  { id: "flyInFlyOut", name: "Вахтовый метод" },
];

export const ORDER_BY_OPTIONS: DictOption[] = [
  { id: "relevance", name: "По соответствию" },
  { id: "publication_time", name: "По дате публикации" },
  { id: "salary_desc", name: "Сначала дороже" },
  { id: "salary_asc", name: "Сначала дешевле" },
];

// Popular regions/cities — stable, well-known hh.ru area ids.
// Used as the default options before the full /api/areas list loads.
export const POPULAR_AREAS: DictOption[] = [
  { id: "113", name: "Вся Россия" },
  { id: "1", name: "Москва" },
  { id: "2", name: "Санкт-Петербург" },
  { id: "3", name: "Екатеринбург" },
  { id: "4", name: "Новосибирск" },
  { id: "66", name: "Нижний Новгород" },
  { id: "88", name: "Казань" },
  { id: "53", name: "Краснодар" },
];

export const DEFAULT_AREA = "113"; // Вся Россия
export const DEFAULT_ORDER_BY = "relevance";
