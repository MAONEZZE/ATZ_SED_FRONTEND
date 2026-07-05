"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api, apiFetchBlob } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { PaginatedResponse, UserSubscription } from "@/lib/api/types";

export function exportUserSubscriptionsCsv(
  eventId: string,
  filters: { search?: string } = {},
): Promise<Blob> {
  const params = new URLSearchParams();
  params.set("format", "csv");
  if (filters.search) params.set("search", filters.search);
  return apiFetchBlob(`/events/${eventId}/user-subscriptions?${params.toString()}`);
}

export function useUserSubscriptions(
  eventId: string,
  params: { search?: string; page?: number; limit?: number } = {},
) {
  const { search, page = 1, limit = 30 } = params;
  const qs = new URLSearchParams();
  if (search) qs.set("search", search);
  qs.set("page", String(page));
  qs.set("limit", String(limit));

  return useQuery({
    queryKey: queryKeys.userSubscriptions(eventId, params),
    queryFn: () =>
      api.get<PaginatedResponse<UserSubscription>>(
        `/events/${eventId}/user-subscriptions?${qs.toString()}`,
      ),
    enabled: Boolean(eventId),
    placeholderData: keepPreviousData,
  });
}
