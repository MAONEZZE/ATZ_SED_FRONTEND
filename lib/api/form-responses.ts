"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api, apiFetchBlob } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { FormResponseRow, PaginatedResponse } from "@/lib/api/types";

export function exportFormResponsesCsv(
  eventId: string,
  formId: string,
  filters: { search?: string } = {},
): Promise<Blob> {
  const params = new URLSearchParams({ format: "csv", formId });
  if (filters.search) params.set("search", filters.search);
  return apiFetchBlob(`/events/${eventId}/form-responses?${params.toString()}`);
}

export function useFormResponses(
  eventId: string,
  params: { formId?: string; search?: string; page?: number; limit?: number } = {},
) {
  const { formId, search, page = 1, limit = 30 } = params;
  const qs = new URLSearchParams();
  if (formId) qs.set("formId", formId);
  if (search) qs.set("search", search);
  qs.set("page", String(page));
  qs.set("limit", String(limit));

  return useQuery({
    queryKey: queryKeys.formResponses(eventId, params),
    queryFn: () =>
      api.get<PaginatedResponse<FormResponseRow>>(
        `/events/${eventId}/form-responses?${qs.toString()}`,
      ),
    // limit 0 = a lista ainda não mediu quantas linhas cabem na tela.
    enabled: Boolean(eventId) && Boolean(formId) && limit > 0,
    placeholderData: keepPreviousData,
  });
}
