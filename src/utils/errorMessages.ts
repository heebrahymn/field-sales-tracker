/**
 * Centralized User-Facing Error Translation Utility
 * Converts raw database (PostgreSQL / RLS / PostgREST), network, storage,
 * auth, and browser hardware errors into clear, actionable messages suitable
 * for field salespeople, Country Sales Heads, and HQ Administrators.
 */

export type UserErrorContext =
  | 'general'
  | 'auth'
  | 'attendance'
  | 'visit'
  | 'meeting_log'
  | 'client_registration'
  | 'exception'
  | 'non_visit'
  | 'device'
  | 'review'
  | 'export'
  | 'import'
  | 'sync'
  | 'camera'
  | 'gps'
  | 'admin';

const CONTEXT_FALLBACKS: Record<UserErrorContext, string> = {
  general: 'Something went wrong while completing your request. Please try again.',
  auth: 'Unable to sign in right now. Please check your credentials and internet connection, then try again.',
  attendance: 'Could not save your attendance record right now. Please try again.',
  visit: 'Could not update this visit right now. Please try again.',
  meeting_log: 'Could not save the meeting log right now. Please try again.',
  client_registration:
    'Unable to register this client location right now. Please check your details and try again.',
  exception: 'Could not submit your exception claim right now. Please try again.',
  non_visit: 'Could not submit your non-visit workday request right now. Please try again.',
  device: 'Unable to update company device details right now. Please try again.',
  review: 'Could not save your review decision right now. Please try again.',
  export: 'Unable to generate the export file right now. Please try again.',
  import: 'Unable to complete the client import. Please review the file and try again.',
  sync: 'This record could not be synced automatically. Please retry when you have a stable connection.',
  camera: 'Unable to access your device camera. Please check camera permissions and try again.',
  gps: 'Unable to get your current GPS location. Move to an open area and try again.',
  admin: 'Unable to save this administrative update right now. Please try again.',
};

const PERMISSION_BY_CONTEXT: Partial<Record<UserErrorContext, string>> = {
  client_registration:
    'Your account does not currently have permission to register this client in your market. Please contact your Country Sales Head or HQ Admin.',
  attendance:
    'Your account is not permitted to record attendance right now. Please verify you are signed in with an active company account.',
  visit:
    'Your account cannot modify this visit record. Please refresh the page or contact your supervisor.',
  meeting_log:
    'Your account cannot submit a meeting log for this visit. Please refresh and try again.',
  exception:
    'Your account could not submit this exception claim. Please make sure you are signed in with your company account.',
  non_visit:
    'Your account does not have permission to update this non-visit request.',
  device:
    'Your account does not have permission to perform this device action. Please contact HQ Admin.',
  review:
    'You do not have permission to review records outside your assigned market.',
  export:
    'You do not have permission to export records for this market.',
  import:
    'Only authorized HQ Administrators can import client records.',
  sync:
    'This offline record was rejected due to an account or market permission mismatch. Please contact your supervisor or HQ Admin.',
  admin:
    'You do not have permission to perform this administrative action.',
};

const DUPLICATE_BY_CONTEXT: Partial<Record<UserErrorContext, string>> = {
  client_registration:
    'A client or branch with these details already exists. Please search the client list before adding a new entry.',
  device:
    'A company device with this asset tag or serial number is already registered.',
  admin:
    'A record with these unique details already exists. Please check existing entries before retrying.',
  attendance:
    'Attendance has already been recorded for today.',
  meeting_log:
    'A meeting log has already been submitted for this visit.',
};

const TECHNICAL_LEAK_PATTERNS: RegExp[] = [
  /row-level security/i,
  /\brls\b/i,
  /\b42501\b/i,
  /\b23505\b/i,
  /\b23503\b/i,
  /\b23502\b/i,
  /\b23514\b/i,
  /\b22p02\b/i,
  /\b22001\b/i,
  /\b08006\b/i,
  /\bpgrst\d+/i,
  /schema cache/i,
  /new row violates/i,
  /violates .* constraint/i,
  /\b(table|relation|column|function)\s+"[^"]+"/i,
  /\bpostgres(ql)?\b/i,
  /\bsupabase\b/i,
  /\bpostgrest\b/i,
  /\bpostgis\b/i,
  /\bindexeddb\b/i,
  /\bdexie\b/i,
  /\bsql\b/i,
  /\brpc\b/i,
  /edge function/i,
  /environment variables missing/i,
  /service key missing/i,
  /unexpected token/i,
  /is not valid json/i,
  /unexpected end of json/i,
  /\b(typeerror|referenceerror|syntaxerror)\b/i,
  /\bstatus code [45]\d\d\b/i,
  /\bhttp [45]\d\d\b/i,
  /\bjwt\b/i,
  /bearer token/i,
  /\bgetusermedia\b/i,
  /\bcamera api\b/i,
  /\bgeolocation api\b/i,
  /internal server error/i,
  /storagePath/i,
  /database error/i,
  /storage error/i,
];

function extractRawErrorMessage(err: unknown): string {
  if (!err) return '';
  if (typeof err === 'string') return err.trim();
  if (err instanceof Error) return (err.message || '').trim();
  if (typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string') {
    return (err as any).message.trim();
  }
  if (typeof err === 'object' && 'error' in err && typeof (err as any).error === 'string') {
    return (err as any).error.trim();
  }
  return '';
}

export function isTechnicalBackendError(message: string): boolean {
  if (!message) return false;
  return TECHNICAL_LEAK_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Translates any error object or raw message string into a clear, non-technical
 * user-facing message while preserving already-clear operational guidance.
 */
export function formatUserFriendlyError(
  err: unknown,
  context: UserErrorContext = 'general',
  fallback?: string
): string {
  const defaultFallback = fallback || CONTEXT_FALLBACKS[context] || CONTEXT_FALLBACKS.general;
  const raw = extractRawErrorMessage(err);
  if (!raw) return defaultFallback;

  const lower = raw.toLowerCase();

  // 1. Hardware & browser permission errors (Camera / GPS)
  if (
    lower.includes('notallowederror') ||
    (context === 'camera' && lower.includes('permission'))
  ) {
    return 'Camera access was denied. Please allow camera permission in your browser settings and try again.';
  }
  if (context === 'gps' && lower.includes('permission')) {
    return 'Location access was denied. Please enable location permissions in your device settings and try again.';
  }
  if (lower.includes('notfounderror') || lower.includes('requested device not found')) {
    return 'No camera was found on this device. Please verify your device camera and try again.';
  }
  if (lower.includes('notreadableerror') || lower.includes('could not start video source')) {
    return 'Your camera is currently in use by another app. Close other camera apps and try again.';
  }
  if (lower.includes('getusermedia') || lower.includes('camera api')) {
    return 'Camera capture is not available in this browser. Please open the app in a supported mobile browser.';
  }
  if (lower.includes('geolocation api')) {
    return 'Location services are not available in this browser. Please open the app on your company handset.';
  }

  // 2. Authentication & expired session errors
  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid email or password')
  ) {
    return 'Incorrect email address or password. Please check your details and try again.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Your work email has not been verified yet. Please contact HQ Admin.';
  }
  if (
    lower.includes('jwt') ||
    lower.includes('token expired') ||
    lower.includes('invalid session') ||
    lower.includes('missing bearer token') ||
    lower.includes('refresh_token') ||
    lower.includes('auth session missing') ||
    lower.includes('user must be authenticated')
  ) {
    return 'Your session has expired. Please sign out and sign in again to continue.';
  }

  // 3. Row-Level Security & permission rejections
  if (
    lower.includes('row-level security') ||
    lower.includes('42501') ||
    lower.includes('permission denied') ||
    lower.includes('insufficient_privilege') ||
    lower.includes('not authorized') ||
    (lower.includes('forbidden') && isTechnicalBackendError(raw))
  ) {
    return (
      PERMISSION_BY_CONTEXT[context] ||
      'You do not have permission to complete this action. Please contact your supervisor or HQ Admin.'
    );
  }

  // 4. Duplicate / unique constraint conflicts
  if (
    lower.includes('duplicate key') ||
    lower.includes('23505') ||
    lower.includes('unique constraint') ||
    lower.includes('already exists')
  ) {
    return (
      DUPLICATE_BY_CONTEXT[context] ||
      'This record has already been saved. Please refresh the page to view the latest details.'
    );
  }

  // 5. Foreign key / relational history protection
  if (
    lower.includes('foreign key') ||
    lower.includes('23503') ||
    lower.includes('still referenced') ||
    lower.includes('user_has_operational_history')
  ) {
    return 'This record cannot be deleted because it is linked to existing activity history. Please deactivate or archive it instead.';
  }

  // 6. Field length, missing column value, or invalid input syntax
  if (lower.includes('value too long') || lower.includes('22001')) {
    return 'One of your entries is too long. Please shorten the text and try again.';
  }
  if (lower.includes('not-null constraint') || lower.includes('23502')) {
    return 'Some required information is missing. Please complete all required fields and try again.';
  }
  if (
    lower.includes('check constraint') ||
    lower.includes('23514') ||
    lower.includes('invalid input syntax') ||
    lower.includes('22p02') ||
    lower.includes('invalid input value for enum')
  ) {
    return 'One or more entered values are not valid. Please check the form fields and try again.';
  }

  // 7. Storage upload / photo size issues
  if (lower.includes('payload too large') || lower.includes('413') || lower.includes('maximum allowed size')) {
    return 'The photo is too large to upload. Please retake the photo and try again.';
  }
  if (
    (lower.includes('bucket') || lower.includes('storage')) &&
    !lower.includes('storage quota is exhausted')
  ) {
    return 'Could not upload the photo right now. Please check your connection and try again.';
  }

  // 8. Network connectivity & timeout errors
  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed') ||
    lower.includes('load failed') ||
    lower.includes('err_internet_disconnected') ||
    lower.includes('08006') ||
    lower.includes('econnrefused') ||
    lower.includes('connection timeout') ||
    lower.includes('timed out')
  ) {
    return 'Unable to connect to the server. Please check your internet connection and try again.';
  }

  // 9. Server configuration, missing schema column/table, or unexpected non-JSON response
  if (
    lower.includes('schema cache') ||
    lower.includes('pgrst') ||
    lower.includes('environment variables missing') ||
    lower.includes('service key missing') ||
    lower.includes('internal server error') ||
    lower.includes('unexpected token') ||
    lower.includes('is not valid json') ||
    lower.includes('unexpected end of json') ||
    /column ".*" does not exist/i.test(raw) ||
    /relation ".*" does not exist/i.test(raw) ||
    /function .* does not exist/i.test(raw)
  ) {
    return 'The service encountered a temporary problem. Please wait a moment and try again, or contact HQ Admin support.';
  }

  // 10. Final safety net: never surface raw database/backend/stack jargon
  if (isTechnicalBackendError(raw)) {
    return defaultFallback;
  }

  return raw;
}
