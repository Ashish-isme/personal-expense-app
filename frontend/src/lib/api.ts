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

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    // Session is gone/expired — drop the token and let the app react.
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
    throw new Error(message);
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
