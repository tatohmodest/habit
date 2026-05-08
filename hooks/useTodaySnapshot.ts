"use client";

import { useQuery } from "@tanstack/react-query";

export function useTodaySnapshot() {
  return useQuery({
    queryKey: ["logs", "today"],
    queryFn: async () => {
      const res = await fetch("/api/logs/today");
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });
}
