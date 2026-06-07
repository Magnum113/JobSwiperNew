"use client";
import { useQuery } from "@tanstack/react-query";
import { POPULAR_AREAS, type DictOption } from "@/lib/hh/dictionaries";

export function useAreas() {
  return useQuery({
    queryKey: ["areas"],
    queryFn: async (): Promise<DictOption[]> => {
      const res = await fetch("/api/areas");
      if (!res.ok) throw new Error("areas");
      const data = await res.json();
      return data.areas as DictOption[];
    },
    staleTime: Infinity,
    gcTime: Infinity,
    // Fall back to the popular list if the request fails.
    placeholderData: POPULAR_AREAS,
    retry: 1,
  });
}
