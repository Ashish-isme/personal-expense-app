// Thin typed wrapper around fetch for talking to the backend.
// In dev, VITE_API_URL is empty and Vite proxies /api to the backend.
// In production, VITE_API_URL points at the Render backend.

const BASE = import.meta.env.VITE_API_URL || "";
const TOKEN_KEY = "finance.token";

// ---- Auth token storage ------------------------------------------------------
// The JWT is kept in localStorage and attached to every request. When a request
// comes back 401 (expired/invalid session) we clear it and send the user to the
// login screen.

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/** Fires when a request is rejected as unauthenticated so the app can log out. */
export const AUTH_ERROR_EVENT = "finance:auth-error";

/** An error response from the API. `status` is 0 when the server couldn't be reached. */
export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/** True for failures worth retrying: server unreachable, waking up, or briefly down. */
export function isTransient(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 0 || err.status >= 500);
}

/**
 * Retries `fn` on transient failures with backoff. The free backend sleeps when
 * idle and takes up to about a minute to wake, so the default budget covers that.
 */
export async function withRetry<T>(fn: () => Promise<T>, delaysMs = [2000, 4000, 8000, 15000, 30000]): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (!isTransient(err) || attempt >= delaysMs.length) throw err;
      await new Promise((r) => setTimeout(r, delaysMs[attempt]));
    }
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
  }

  // Session is gone/expired — drop the token and let the app react. Only if the
  // rejected token is still the current one: a slow request from an old session
  // must not wipe out a login that happened while it was in flight.
  if (res.status === 401 && token && token === getToken()) {
    setToken(null);
    window.dispatchEvent(new Event(AUTH_ERROR_EVENT));
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* ignore non-JSON error bodies */
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(data) }),
  put: <T>(path: string, data: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(data) }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PATCH", body: data ? JSON.stringify(data) : undefined }),
  del: (path: string) => request<void>(path, { method: "DELETE" }),
};

/** Absolute URL for file-download endpoints (CSV / Excel). Includes the token. */
export function downloadUrl(path: string): string {
  const token = getToken();
  const sep = path.includes("?") ? "&" : "?";
  return `${BASE}${path}${token ? `${sep}token=${encodeURIComponent(token)}` : ""}`;
}
