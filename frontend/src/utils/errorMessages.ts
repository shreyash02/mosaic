import { AxiosError } from 'axios';

interface ApiErrorResponse {
  detail?: string | { msg: string }[];
  message?: string;
}

/**
 * Formats API errors into user-friendly messages.
 *
 * Rules:
 * - Network errors and 5xx: Generic "Failed to {action}, please try again"
 * - 4xx with API message: Show the API's error message
 * - 4xx without message: Generic "Failed to {action}, please try again"
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
      if (typeof data.detail === 'string') {
        return data.detail;
      }
      if (Array.isArray(data.detail) && data.detail.length > 0) {
        return data.detail[0].msg;
      }
    }

    // Some APIs return { message: "..." }
    if (data?.message && typeof data.message === 'string') {
      return data.message;
    }
  }

  // Fallback for any other case
  return fallbackMessage;
}
