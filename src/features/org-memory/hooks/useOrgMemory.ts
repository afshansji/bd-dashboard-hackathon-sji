import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orgMemoryApi } from "../api";
import type {
  OrgMemoryCapability,
  OrgMemoryQueryResult,
  OrgRepository,
} from "../types";

export function useOrgRepositories() {
  return useQuery({
    queryKey: ["org_memory", "repos"],
    queryFn: async () => {
      const data = await orgMemoryApi.listRepos();
      return (data.repositories ?? []) as OrgRepository[];
    },
  });
}

export function useCreateOrgRepository() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      url: string;
      defaultBranch?: string;
      tags?: string[];
    }) => {
      const data = await orgMemoryApi.createRepo({
        name: input.name.trim(),
        url: input.url.trim(),
        defaultBranch: input.defaultBranch ?? "main",
        ...(input.tags?.length ? { tags: input.tags } : {}),
      });

      if (data.existing) {
        return {
          ...(data.repository as OrgRepository),
          _existing: true,
        } as OrgRepository & { _existing?: boolean };
      }
      return data.repository as OrgRepository;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org_memory", "repos"] });
    },
  });
}

export function useTriggerOrgIndex() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (repositoryId?: string) => {
      return orgMemoryApi.triggerIndex({ repositoryId, force: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org_memory", "repos"] });
    },
  });
}

export function useOrgMemoryQuery() {
  return useMutation({
    mutationFn: async (input: {
      query: string;
      capabilities: OrgMemoryCapability[];
    }) => {
      const data = await orgMemoryApi.query(input);
      return data as OrgMemoryQueryResult;
    },
  });
}
