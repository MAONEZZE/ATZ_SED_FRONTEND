"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { UazapiInstance } from "@/lib/api/types";

export function useUazapiInstances() {
  return useQuery({
    queryKey: queryKeys.uazapiInstances,
    queryFn: () => api.get<UazapiInstance[]>("/uazapi-instances"),
    select: (instances) =>
      [...instances].sort((a, b) => Number(b.active) - Number(a.active)),
  });
}
