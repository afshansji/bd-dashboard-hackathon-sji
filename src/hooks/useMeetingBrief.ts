import {
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { meetingBriefApi } from "@/features/upwork-jobs/api/meetingBrief";
import type {
  MeetingBriefResponse,
  MeetingBriefWorkspaceContext,
} from "@/features/upwork-jobs/types/meetingBrief";

export function useMeetingBrief(jobId: string) {
  return useQuery({
    queryKey: ["meeting-brief", jobId],
    queryFn: async (): Promise<MeetingBriefResponse | null> => {
      const data = await meetingBriefApi.getBrief(jobId);
      if (!data.brief) return null;
      return data as MeetingBriefResponse;
    },
    staleTime: 60_000,
  });
}

export function useGenerateMeetingBrief(jobId: string) {
  const queryClient = useQueryClient();
  const isGenerating =
    useIsMutating({ mutationKey: ["generate-meeting-brief", jobId] }) > 0;

  const mutation = useMutation({
    mutationKey: ["generate-meeting-brief", jobId],
    mutationFn: async ({
      workspace,
      force = false,
    }: {
      workspace: MeetingBriefWorkspaceContext;
      force?: boolean;
    }) => {
      return meetingBriefApi.generateBrief(jobId, workspace, force);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["meeting-brief", jobId], data);
    },
  });

  return { ...mutation, isPending: mutation.isPending || isGenerating };
}
