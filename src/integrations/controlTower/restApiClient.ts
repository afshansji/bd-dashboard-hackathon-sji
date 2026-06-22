/**
 * Control Tower REST API Client
 *
 * Official REST API client for accessing Control Tower data.
 * Replaces direct Supabase-to-Supabase connections with official API endpoints.
 *
 * API Documentation: Control Tower REST API v1
 * Base URL: https://ttlmdbgptqlvjswtcrnq.supabase.co/functions/v1
 * Authentication: Bearer token (API key with required scopes)
 *
 * @module controlTower/restApiClient
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface ControlTowerAPIConfig {
  baseUrl: string;
  apiKey: string;
  version?: string;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: APIError;
  pagination?: PaginationInfo;
  rateLimit?: RateLimitInfo;
}

export interface APIError {
  code: string;
  message: string;
  status: number;
  details?: any;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
  has_next_page: boolean;
  has_previous_page: boolean;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: string; // ISO timestamp
}

// Client Types
export interface APIClient {
  id: string;
  name: string;
  email?: string;
  company?: string;
  phone?: string;
  status: 'active' | 'inactive' | 'archived';
  website?: string;
  industry?: string;
  contact_person?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateClientPayload {
  name: string;
  email?: string;
  company?: string;
  phone?: string;
  status?: 'active' | 'inactive' | 'archived';
  website?: string;
  industry?: string;
  contact_person?: string;
  address?: string;
}

export interface UpdateClientPayload {
  name?: string;
  email?: string;
  company?: string;
  phone?: string;
  status?: 'active' | 'inactive' | 'archived';
  website?: string;
  industry?: string;
  contact_person?: string;
  address?: string;
}

export interface ListClientsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive' | 'archived';
}

export interface ListClientsResponse {
  clients: APIClient[];
  pagination: PaginationInfo;
}

// API Key Validation
export interface ValidateAPIKeyParams {
  scope?: string;
}

export interface ValidateAPIKeyResponse {
  valid: boolean;
  key_type: 'live' | 'test';
  scopes: string[];
  rate_limit: RateLimitInfo;
}

// ============================================================================
// Error Codes (from API documentation)
// ============================================================================

export enum APIErrorCode {
  // Authentication Errors
  MISSING_API_KEY = 'missing_api_key',
  INVALID_KEY = 'invalid_key',
  EXPIRED_KEY = 'expired_key',

  // Authorization Errors
  INSUFFICIENT_SCOPE = 'insufficient_scope',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',

  // Validation Errors
  VALIDATION_ERROR = 'validation_error',
  MISSING_REQUIRED_FIELD = 'missing_required_field',
  INVALID_FORMAT = 'invalid_format',

  // Resource Errors
  NOT_FOUND = 'not_found',
  ALREADY_EXISTS = 'already_exists',

  // Database Errors
  DATABASE_ERROR = 'database_error',

  // Server Errors
  INTERNAL_ERROR = 'internal_error',
}

// ============================================================================
// API Client Class
// ============================================================================

export class ControlTowerAPIClient {
  private config: ControlTowerAPIConfig;
  private rateLimitInfo?: RateLimitInfo;

  constructor(config: ControlTowerAPIConfig) {
    this.config = {
      ...config,
      version: config.version || 'v1',
    };

    if (!this.config.apiKey) {
      throw new Error('API key is required');
    }

    if (!this.config.baseUrl) {
      throw new Error('Base URL is required');
    }
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Make an HTTP request to the API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`;

    const headers = {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Extract rate limit information from headers
      this.extractRateLimitInfo(response);

      // Handle rate limiting
      if (response.status === 429) {
        const resetTime = response.headers.get('X-RateLimit-Reset');
        throw this.createAPIError(
          APIErrorCode.RATE_LIMIT_EXCEEDED,
          `Rate limit exceeded. Resets at ${resetTime}`,
          429,
          { resetTime }
        );
      }

      // Parse response body
      const body = await response.json();

      // Handle error responses
      if (!response.ok) {
        throw this.createAPIError(
          body.error?.code || APIErrorCode.INTERNAL_ERROR,
          body.error?.message || 'Unknown error',
          response.status,
          body.error?.details
        );
      }

      return {
        success: true,
        data: body.data || body,
        pagination: body.pagination,
        rateLimit: this.rateLimitInfo,
      };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        // Already an APIError, re-throw
        throw error;
      }

      // Network or other errors
      throw this.createAPIError(
        APIErrorCode.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Network error',
        0
      );
    }
  }

  /**
   * Extract rate limit information from response headers
   */
  private extractRateLimitInfo(response: Response): void {
    const limit = response.headers.get('X-RateLimit-Limit');
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const reset = response.headers.get('X-RateLimit-Reset');

    if (limit && remaining && reset) {
      this.rateLimitInfo = {
        limit: parseInt(limit, 10),
        remaining: parseInt(remaining, 10),
        reset,
      };
    }
  }

  /**
   * Create a structured API error
   */
  private createAPIError(
    code: string,
    message: string,
    status: number,
    details?: any
  ): Error & { code: string; status: number; details?: any } {
    const error = new Error(message) as Error & {
      code: string;
      status: number;
      details?: any;
    };
    error.code = code;
    error.status = status;
    error.details = details;
    return error;
  }

  /**
   * Retry logic with exponential backoff
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on certain errors
        if ('code' in lastError) {
          const code = (lastError as any).code;
          if ([
            APIErrorCode.INVALID_KEY,
            APIErrorCode.EXPIRED_KEY,
            APIErrorCode.INSUFFICIENT_SCOPE,
            APIErrorCode.VALIDATION_ERROR,
          ].includes(code)) {
            throw lastError;
          }
        }

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          throw lastError;
        }

        // Exponential backoff
        const delay = initialDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Wait for rate limit reset
   */
  private async waitForRateLimit(): Promise<void> {
    if (!this.rateLimitInfo) return;

    const { remaining, reset } = this.rateLimitInfo;

    // If we have less than 10 requests remaining, wait
    if (remaining < 10) {
      const resetTime = new Date(reset).getTime();
      const now = Date.now();
      const waitTime = Math.max(0, resetTime - now);

      if (waitTime > 0) {
        console.warn(`Rate limit nearly exceeded. Waiting ${waitTime}ms until reset...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  // ==========================================================================
  // Public API Methods
  // ==========================================================================

  /**
   * Get current rate limit information
   */
  public getRateLimitInfo(): RateLimitInfo | undefined {
    return this.rateLimitInfo;
  }

  /**
   * Validate API Key
   * GET /validate-api-key
   */
  public async validateAPIKey(
    params?: ValidateAPIKeyParams
  ): Promise<APIResponse<ValidateAPIKeyResponse>> {
    const queryParams = new URLSearchParams();
    if (params?.scope) {
      queryParams.append('scope', params.scope);
    }

    const endpoint = `/validate-api-key${queryParams.toString() ? `?${queryParams}` : ''}`;
    return this.request<ValidateAPIKeyResponse>(endpoint, {
      method: 'GET',
    });
  }

  // ==========================================================================
  // Clients API
  // ==========================================================================

  /**
   * List all clients with pagination and filtering
   * GET /api-v1-clients
   */
  public async listClients(
    params?: ListClientsParams
  ): Promise<APIResponse<ListClientsResponse>> {
    await this.waitForRateLimit();

    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);

    const endpoint = `/api-v1-clients${queryParams.toString() ? `?${queryParams}` : ''}`;

    return this.retryWithBackoff(() =>
      this.request<ListClientsResponse>(endpoint, {
        method: 'GET',
      })
    );
  }

  /**
   * Get a single client by ID
   * GET /api-v1-clients/{id}
   */
  public async getClientById(id: string): Promise<APIResponse<APIClient>> {
    await this.waitForRateLimit();

    return this.retryWithBackoff(() =>
      this.request<APIClient>(`/api-v1-clients/${id}`, {
        method: 'GET',
      })
    );
  }

  /**
   * Create a new client
   * POST /api-v1-clients
   */
  public async createClient(
    data: CreateClientPayload
  ): Promise<APIResponse<APIClient>> {
    await this.waitForRateLimit();

    return this.retryWithBackoff(() =>
      this.request<APIClient>('/api-v1-clients', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    );
  }

  /**
   * Update an existing client
   * PATCH /api-v1-clients/{id}
   */
  public async updateClient(
    id: string,
    data: UpdateClientPayload
  ): Promise<APIResponse<APIClient>> {
    await this.waitForRateLimit();

    return this.retryWithBackoff(() =>
      this.request<APIClient>(`/api-v1-clients/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
    );
  }

  /**
   * Delete a client
   * DELETE /api-v1-clients/{id}
   */
  public async deleteClient(id: string): Promise<APIResponse<void>> {
    await this.waitForRateLimit();

    return this.retryWithBackoff(() =>
      this.request<void>(`/api-v1-clients/${id}`, {
        method: 'DELETE',
      })
    );
  }

  // ==========================================================================
  // Future: Leads API (when available)
  // ==========================================================================

  /**
   * PLACEHOLDER: List all leads
   *
   * NOTE: Lead endpoints are not yet available in the Control Tower API.
   * This method will be implemented once the API team adds Lead support.
   *
   * Expected endpoint: GET /api-v1-leads
   * Expected scope: 'leads'
   */
  public async listLeads(): Promise<APIResponse<any>> {
    throw new Error(
      'Lead API endpoints are not yet available. ' +
      'Please use direct Supabase access for leads until the API is ready. ' +
      'Contact Control Tower team to request Lead API support.'
    );
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a Control Tower API client instance
 */
export function createControlTowerAPIClient(
  config: ControlTowerAPIConfig
): ControlTowerAPIClient {
  return new ControlTowerAPIClient(config);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if an error is an API error with a specific code
 */
export function isAPIError(error: unknown, code?: APIErrorCode): boolean {
  if (!(error instanceof Error)) return false;
  if (!('code' in error)) return false;
  if (code) return (error as any).code === code;
  return true;
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return 'Unknown error';

  if ('code' in error) {
    const apiError = error as any;
    switch (apiError.code) {
      case APIErrorCode.MISSING_API_KEY:
        return 'API key is missing. Please configure your API key in settings.';
      case APIErrorCode.INVALID_KEY:
        return 'Invalid API key. Please check your configuration.';
      case APIErrorCode.EXPIRED_KEY:
        return 'API key has expired. Please contact your administrator.';
      case APIErrorCode.INSUFFICIENT_SCOPE:
        return 'Insufficient permissions. Your API key does not have the required scope.';
      case APIErrorCode.RATE_LIMIT_EXCEEDED:
        return 'Rate limit exceeded. Please wait before making more requests.';
      case APIErrorCode.VALIDATION_ERROR:
        return `Validation error: ${error.message}`;
      case APIErrorCode.NOT_FOUND:
        return 'Resource not found.';
      case APIErrorCode.ALREADY_EXISTS:
        return 'Resource already exists.';
      case APIErrorCode.DATABASE_ERROR:
        return 'Database error. Please try again later.';
      case APIErrorCode.INTERNAL_ERROR:
        return 'Internal server error. Please try again later.';
      default:
        return error.message;
    }
  }

  return error.message;
}
