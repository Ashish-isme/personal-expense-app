import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, setToken, getToken, AUTH_ERROR_EVENT } from "../lib/api";
import type { User } from "../lib/types";

interface AuthResponse {
  token: string;
  user: User;
}

interface AuthContextValue {
  user: User | null;
  /** True until we've checked for an existing session on first load. */
  initializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  // On mount, if we have a stored token, verify it and load the user.
  useEffect(() => {
    if (!getToken()) {
      setInitializing(false);
      return;
    }
    api
      .get<{ user: User }>("/api/auth/me")
      .then((res) => setUser(res.user))
      .catch(() => logout())
      .finally(() => setInitializing(false));
  }, [logout]);

  // If any request comes back 401, drop the session.
  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener(AUTH_ERROR_EVENT, handler);
    return () => window.removeEventListener(AUTH_ERROR_EVENT, handler);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<AuthResponse>("/api/auth/login", { email, password });
    setToken(res.token);
    setUser(res.user);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await api.post<AuthResponse>("/api/auth/register", { name, email, password });
    setToken(res.token);
    setUser(res.user);
  }, []);

  return (
    <AuthContext.Provider value={{ user, initializing, login, register, logout }}>
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
