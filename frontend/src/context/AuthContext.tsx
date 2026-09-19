import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, setToken, getToken, withRetry, ApiError, AUTH_ERROR_EVENT } from "../lib/api";
import type { User } from "../lib/types";

interface AuthResponse {
  token: string;
  user: User;
}

interface AuthContextValue {
  user: User | null;
  /** True until we've checked for an existing session on first load. */
  initializing: boolean;
  /** Set when the stored session couldn't be checked because the server was unreachable. */
  sessionError: string | null;
  /** Re-runs the stored-session check after a `sessionError`. */
  retrySession: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  // On mount, if we have a stored token, verify it and load the user. Only a
  // 401 means the session is invalid — anything else (server asleep, database
  // waking up, network blip) is retried, and the token is kept.
  useEffect(() => {
    if (!getToken()) {
      setInitializing(false);
      return;
    }
    let active = true;
    setInitializing(true);
    setSessionError(null);
    withRetry(() => api.get<{ user: User }>("/api/auth/me"))
      .then((res) => active && setUser(res.user))
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiError && (err.status === 401 || err.status === 404)) logout();
        else setSessionError((err as Error).message);
      })
      .finally(() => active && setInitializing(false));
    return () => {
      active = false;
    };
  }, [logout, attempt]);

  const retrySession = useCallback(() => setAttempt((n) => n + 1), []);

  // If any request comes back 401, drop the session.
  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener(AUTH_ERROR_EVENT, handler);
    return () => window.removeEventListener(AUTH_ERROR_EVENT, handler);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await withRetry(() => api.post<AuthResponse>("/api/auth/login", { email, password }));
    setToken(res.token);
    setUser(res.user);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await withRetry(() => api.post<AuthResponse>("/api/auth/register", { name, email, password }));
    setToken(res.token);
    setUser(res.user);
  }, []);

  return (
    <AuthContext.Provider value={{ user, initializing, sessionError, retrySession, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
