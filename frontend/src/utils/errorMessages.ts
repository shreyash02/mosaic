import { AxiosError } from 'axios';

interface ApiErrorResponse {
  detail?: string | { msg: string }[];
  message?: string;
}

// Framework-generated responses (Starlette/FastAPI defaults, HTTP reason
// phrases) that were never written for end users. If `detail` is one of
// these, no route author crafted a message — show the generic fallback.
const RAW_HTTP_PHRASES = new Set([
  'bad request',
  'unauthorized',
  'not authenticated',
  'could not validate credentials',
  'forbidden',
  'not found',
  'method not allowed',
  'not acceptable',
  'request timeout',
  'conflict',
  'gone',
  'payload too large',
  'unsupported media type',
  'unprocessable entity',
  'too many requests',
]);

function isRawHttpPhrase(text: string): boolean {
  return RAW_HTTP_PHRASES.has(text.trim().toLowerCase());
}

/**
 * Formats API errors into user-friendly messages.
 *
 * Rules:
 * - Network errors and 5xx: Generic "Failed to {action}, please try again"
 * - 4xx with an intentional API message: Show the API's error message
 * - 4xx with a framework default ("Method Not Allowed", "Not Found", ...)
 *   or no message: Generic "Failed to {action}, please try again"
 */
export function getErrorMessage(
  error: unknown,
  fallbackAction: string = 'complete the action'
): string {
  const fallbackMessage = `Failed to ${fallbackAction}, please try again`;

  // Not an Axios error - return generic message
  if (!(error instanceof Error)) {
    return fallbackMessage;
  }

  const axiosError = error as AxiosError<ApiErrorResponse>;

  // Network error (no response)
  if (!axiosError.response) {
    return fallbackMessage;
  }

  const status = axiosError.response.status;

  // 5xx server errors - generic message
  if (status >= 500) {
    return fallbackMessage;
  }

  // 4xx client errors - try to extract API message
  if (status >= 400 && status < 500) {
    const data = axiosError.response.data;

    // FastAPI returns { detail: "message" } or { detail: [{ msg: "..." }] }
    if (data?.detail) {
      if (typeof data.detail === 'string' && !isRawHttpPhrase(data.detail)) {
        return data.detail;
      }
      if (Array.isArray(data.detail) && data.detail.length > 0 && typeof data.detail[0]?.msg === 'string') {
        return data.detail[0].msg;
      }
    }

    // Some APIs return { message: "..." }
    if (data?.message && typeof data.message === 'string' && !isRawHttpPhrase(data.message)) {
      return data.message;
    }
  }

  // Fallback for any other case
  return fallbackMessage;
}
