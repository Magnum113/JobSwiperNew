"use client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchVacancies } from "@/lib/api-client";
import type { Filters } from "@/lib/types";

export function useVacancies(filters: Filters, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ["vacancies", filters],
    queryFn: ({ pageParam }) => fetchVacancies(filters, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => {
      const next = last.page + 1;
      if (next >= last.pages) return undefined;
      // hh.ru pagination cap: page * per_page <= 2000
      if (next * last.per_page >= 2000) return undefined;
      return next;
    },
    enabled,
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
  });
}
