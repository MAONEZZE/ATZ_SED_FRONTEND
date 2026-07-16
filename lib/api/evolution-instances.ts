"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { EvolutionInstance } from "@/lib/api/types";

export function useEvolutionInstances() {
  return useQuery({
    queryKey: queryKeys.evolutionInstances,
    queryFn: () => api.get<EvolutionInstance[]>("/evolution-instances"),
  });
}
