import { supabase } from "@/integrations/supabase/client";
import axiosPrivate from "@/lib/axiosPrivate";

export type FeedbackType = "bug" | "feature";
export type FeedbackStatus = "open" | "in_review" | "resolved" | "closed";
export type FeedbackPriority = "low" | "medium" | "high";

export interface AttachmentInfo {
  fileName: string;
  filePath: string;
  fileSize?: number;
  contentType?: string;
}

export interface SubmitFeedbackPayload {
  id?: string;
  type: FeedbackType;
  subject: string;
  description?: string;
  module?: string | null;
  attachmentPath?: string | null; // Legacy single attachment support
  attachmentName?: string | null; // Legacy single attachment support
  attachments?: AttachmentInfo[]; // New multiple attachments support
}

export interface FeedbackReport {
  id: string;
  type: FeedbackType;
  subject: string;
  description: string | null;
  status: FeedbackStatus;
  priority?: FeedbackPriority | null;
  module?: string | null;
  feedback_number?: number | null;
  upvote_count?: number | null;
  comment_count?: number | null;
  email: string | null;
  attachment_url: string | null;
  created_by: string;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  submitted_by_name?: string | null;
  reviewed_by_name?: string | null;
}

export interface FeedbackComment {
  id: string;
  feedback_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  author_name?: string | null;
  author_email?: string | null;
}

export interface FeedbackListResponse {
  items: FeedbackReport[];
  total: number;
}

export interface FeedbackAttachment {
  id: string;
  fileName: string;
  fileSize: number | null;
  contentType: string | null;
  signedUrl: string;
  createdAt: string;
}

export interface FeedbackDetailResponse {
  feedback: FeedbackReport;
  comments: FeedbackComment[];
  has_upvoted?: boolean;
  attachment_signed_url?: string | null; // Legacy single attachment
  attachments?: FeedbackAttachment[]; // New multiple attachments
}

export async function submitFeedback(payload: SubmitFeedbackPayload) {
  console.log("[submitFeedback] Invoking edge function");

  const { data, error } = await supabase.functions.invoke<{ id: string; status: FeedbackStatus }>("submit-feedback", {
    body: payload,
  });

  if (error) {
    console.error("[submitFeedback] Edge function error:", error);
    throw new Error(error.message || "Failed to submit feedback");
  }

  console.log("[submitFeedback] Success:", data);
  return data!;
}

export async function listFeedbackReports(params: {
  type?: FeedbackType;
  status?: FeedbackStatus;
  statuses?: FeedbackStatus[];
  includeClosed?: boolean;
  module?: string;
  page?: number;
  pageSize?: number;
  search?: string;
}) {
  const { statuses, ...restParams } = params;
  const apiParams: Record<string, string | number | boolean> = {};
  
  if (restParams.type) apiParams.type = restParams.type;
  if (restParams.status) apiParams.status = restParams.status;
  if (restParams.includeClosed !== undefined) apiParams.includeClosed = restParams.includeClosed;
  if (restParams.module) apiParams.module = restParams.module;
  if (restParams.page !== undefined) apiParams.page = restParams.page;
  if (restParams.pageSize !== undefined) apiParams.pageSize = restParams.pageSize;
  if (restParams.search) apiParams.search = restParams.search;
  
  if (statuses && statuses.length > 0) {
    apiParams.statuses = statuses.join(",");
    delete apiParams.status;
  }
  
  const response = await axiosPrivate.get<FeedbackListResponse>("/manage-feedback/list", {
    params: apiParams,
  });
  return response.data;
}

export async function getFeedbackDetail(id: string) {
  const response = await axiosPrivate.get<FeedbackDetailResponse>(`/manage-feedback/${id}`);
  return response.data;
}

export async function postFeedbackComment(id: string, comment: string) {
  const response = await axiosPrivate.post<FeedbackComment>(`/manage-feedback/${id}/comment`, { comment });
  return response.data;
}

export async function updateFeedbackStatus(id: string, status: FeedbackStatus) {
  const response = await axiosPrivate.put<FeedbackReport>(`/manage-feedback/${id}/status`, { status });
  return response.data;
}

export async function updateFeedbackPriority(id: string, priority: FeedbackPriority | null) {
  const response = await axiosPrivate.put<FeedbackReport>(`/manage-feedback/${id}/priority`, { priority });
  return response.data;
}

export async function updateFeedbackModule(id: string, module: string | null) {
  const response = await axiosPrivate.put<FeedbackReport>(`/manage-feedback/${id}/module`, { module });
  return response.data;
}

export async function addFeedbackUpvote(id: string) {
  const response = await axiosPrivate.post<{ upvote_count: number }>(`/manage-feedback/${id}/upvote`);
  return response.data;
}

export async function removeFeedbackUpvote(id: string) {
  const response = await axiosPrivate.delete<{ upvote_count: number }>(`/manage-feedback/${id}/upvote`);
  return response.data;
}

export async function deleteFeedback(id: string) {
  const response = await axiosPrivate.delete<{ success: boolean }>(`/manage-feedback/${id}`);
  return response.data;
}
