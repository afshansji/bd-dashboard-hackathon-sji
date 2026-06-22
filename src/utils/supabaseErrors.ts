/**
 * Utility to wrap Supabase errors and provide friendly error messages
 * for common scenarios like missing tables (migrations pending)
 */

export interface SupabaseErrorInfo {
  isTableMissing: boolean;
  isMigrationNeeded: boolean;
  friendlyMessage: string;
  originalError: any;
}

/**
 * Check if a Supabase error is due to a missing table
 */
export function isTableMissingError(error: any): boolean {
  if (!error) return false;

  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code;

  // PostgreSQL error code 42P01 = "relation does not exist" (table not found)
  if (errorCode === '42P01') return true;

  // Check error message patterns
  const missingTablePatterns = [
    'relation',
    'does not exist',
    'table',
    'not found',
    'undefined table',
  ];

  return missingTablePatterns.every(pattern =>
    errorMessage.includes(pattern.toLowerCase())
  );
}

/**
 * Wrap a Supabase error with additional context and friendly messaging
 */
export function wrapSupabaseError(error: any, tableName?: string): SupabaseErrorInfo {
  const isTableMissing = isTableMissingError(error);

  let friendlyMessage = error.message || 'An unexpected error occurred';

  if (isTableMissing) {
    friendlyMessage = tableName
      ? `The ${tableName} table is missing. Please run the latest database migrations.`
      : 'A required database table is missing. Please run the latest database migrations.';
  }

  return {
    isTableMissing,
    isMigrationNeeded: isTableMissing,
    friendlyMessage,
    originalError: error,
  };
}

/**
 * Enhanced error class for Supabase errors
 */
export class SupabaseError extends Error {
  public isTableMissing: boolean;
  public isMigrationNeeded: boolean;
  public originalError: any;

  constructor(errorInfo: SupabaseErrorInfo) {
    super(errorInfo.friendlyMessage);
    this.name = 'SupabaseError';
    this.isTableMissing = errorInfo.isTableMissing;
    this.isMigrationNeeded = errorInfo.isMigrationNeeded;
    this.originalError = errorInfo.originalError;
  }
}

/**
 * Handle Supabase errors with appropriate logging and user-friendly messages
 */
export function handleSupabaseError(error: any, tableName?: string): never {
  const errorInfo = wrapSupabaseError(error, tableName);

  // Log the original error for debugging
  console.error('Supabase error:', {
    tableName,
    isTableMissing: errorInfo.isTableMissing,
    originalError: errorInfo.originalError,
  });

  throw new SupabaseError(errorInfo);
}
