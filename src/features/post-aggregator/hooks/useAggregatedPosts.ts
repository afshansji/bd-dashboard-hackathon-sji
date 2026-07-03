import { useQuery } from "@tanstack/react-query";
import { aggregatePosts } from "../services/aggregatePosts";
import type { AggregatedPostsResponse } from "../types";

async function fetchAggregatedPosts(): Promise<AggregatedPostsResponse> {
  try {
    const response = await fetch("/api/posts");
    const contentType = response.headers.get("content-type") ?? "";

    if (response.ok && contentType.includes("application/json")) {
      return response.json() as Promise<AggregatedPostsResponse>;
    }
  } catch {
    // Fall through to client-side aggregation below.
  }

  return aggregatePosts();
}

export function useAggregatedPosts() {
  return useQuery({
    queryKey: ["aggregated-posts"],
    queryFn: fetchAggregatedPosts,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
