import { supabase } from "@/integrations/supabase/client";

interface RequestParams {
  [key: string]: string | number | boolean | null | undefined;
}

interface RequestConfig {
  params?: RequestParams;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export interface AxiosResponse<T> {
  data: T;
}

const sanitizeSupabaseUrl = (url: string) => url.trim().replace(/\/+$/, "");

export const createUrlBuilder = (rawSupabaseUrl: string) => {
  const sanitizedSupabaseUrl = sanitizeSupabaseUrl(rawSupabaseUrl);
  if (!sanitizedSupabaseUrl) {
    throw new Error("Supabase URL is not configured");
  }

  const basePath = `${sanitizedSupabaseUrl}/functions/v1`;
  const baseForUrl = basePath.endsWith("/") ? basePath : `${basePath}/`;

  return (path: string, params?: RequestParams) => {
    const normalizedPath = path.trim().replace(/^\/+/, "");
    const url = new URL(normalizedPath, baseForUrl);

    if (!params) {
      return url.toString();
    }

    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) {
        continue;
      }
      url.searchParams.set(key, String(value));
    }

    return url.toString();
  };
};

let cachedBuilder: ReturnType<typeof createUrlBuilder> | null = null;

const resolveBuilder = () => {
  if (!cachedBuilder) {
    const rawSupabaseUrl = import.meta.env?.VITE_SUPABASE_URL ?? "";
    cachedBuilder = createUrlBuilder(rawSupabaseUrl);
  }

  return cachedBuilder;
};

const buildUrl = (path: string, params?: RequestParams) =>
  resolveBuilder()(path, params);

async function request<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  url: string,
  data?: unknown,
  config: RequestConfig = {}
): Promise<AxiosResponse<T>> {
  const { params, headers, signal } = config;
  const requestUrl = buildUrl(url, params);

  const { data: session } = await supabase.auth.getSession();
  const accessToken = session?.session?.access_token;

  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...headers,
  };

  if (data !== undefined && data !== null) {
    finalHeaders["Content-Type"] = "application/json";
  }

  const response = await fetch(requestUrl, {
    method,
    headers: finalHeaders,
    body: data ? JSON.stringify(data) : undefined,
    signal,
  });

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;

    try {
      const errorData = await response.json();
      // Handle both 'message' and 'error' fields in error responses
      if (typeof errorData?.message === "string") {
        errorMessage = errorData.message;
      } else if (typeof errorData?.error === "string") {
        errorMessage = errorData.error;
      }
    } catch (error) {
      // Ignore JSON parsing errors for non-JSON responses
    }

    throw new Error(errorMessage);
  }

  try {
    const responseData = (await response.json()) as T;
    return { data: responseData };
  } catch (error) {
    // Allow endpoints that return no content
    return { data: undefined as unknown as T };
  }
}

const axiosPrivate = {
  get: async <T>(url: string, config?: RequestConfig) =>
    request<T>("GET", url, undefined, config),
  post: async <T>(url: string, data?: unknown, config?: RequestConfig) =>
    request<T>("POST", url, data, config),
  put: async <T>(url: string, data?: unknown, config?: RequestConfig) =>
    request<T>("PUT", url, data, config),
  patch: async <T>(url: string, data?: unknown, config?: RequestConfig) =>
    request<T>("PATCH", url, data, config),
  delete: async <T>(url: string, config?: RequestConfig) =>
    request<T>("DELETE", url, undefined, config),
};

export default axiosPrivate;
