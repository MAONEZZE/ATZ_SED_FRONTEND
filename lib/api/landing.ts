"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { LandingPage, LandingSection } from "@/lib/api/types";

export interface SectionUpdateInput {
  enabled?: boolean;
  order?: number;
  content?: Record<string, unknown> | null;
}

export function useLanding(eventId: string) {
  return useQuery({
    queryKey: queryKeys.landing(eventId),
    queryFn: () => api.get<LandingPage>(`/events/${eventId}/landing`),
    enabled: Boolean(eventId),
  });
}

export function useUpdateLandingSection(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sectionId, input }: { sectionId: string; input: SectionUpdateInput }) =>
      api.patch<LandingSection>(
        `/events/${eventId}/landing/sections/${sectionId}`,
        input,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.landing(eventId) }),
  });
}

/** Salva várias seções alteradas (contrato: PATCH por seção) */
export function useSaveLandingSections(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      changes: { sectionId: string; input: SectionUpdateInput }[],
    ) => {
      await Promise.all(
        changes.map(({ sectionId, input }) =>
          api.patch<LandingSection>(
            `/events/${eventId}/landing/sections/${sectionId}`,
            input,
          ),
        ),
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.landing(eventId) }),
  });
}
