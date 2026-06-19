"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Profile, WhatsAppGroup } from "@/lib/api/types";

export interface ProfileUpdateInput {
  name?: string;
  evolutionInstance?: string;
}

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: () => api.get<Profile>("/profile/me"),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProfileUpdateInput) => api.patch<Profile>("/profile/me", input),
    onSuccess: (profile) => queryClient.setQueryData(queryKeys.profile, profile),
  });
}

export function useUploadProfilePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.post<Profile>("/profile/me/photo", formData);
    },
    onSuccess: (profile) => queryClient.setQueryData(queryKeys.profile, profile),
  });
}

export function useWhatsAppGroups() {
  const { data: profile } = useProfile();
  const instance = profile?.evolutionInstance;
  return useQuery({
    queryKey: ["whatsapp-groups", instance ?? ""],
    queryFn: () =>
      api.get<WhatsAppGroup[]>(
        `/whatsapp/groups?instancia=${encodeURIComponent(instance!)}`,
      ),
    enabled: Boolean(instance),
  });
}

export function useDeleteProfilePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete<Profile>("/profile/me/photo"),
    onSuccess: (profile) => queryClient.setQueryData(queryKeys.profile, profile),
  });
}
