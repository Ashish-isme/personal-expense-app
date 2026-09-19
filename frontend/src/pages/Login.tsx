import { useEffect, useState } from "react";
import { PiggyBank } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/Button";
import { FieldWrap, Input } from "../components/ui/Field";
import { api } from "../lib/api";
import { useSlowHint } from "../lib/useSlowHint";

/** Combined sign-in / sign-up screen shown when there is no active session. */
export function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const slow = useSlowHint(submitting);

  // Start waking the server and database while the user is still typing, so
  // the sign-in itself doesn't have to wait for a cold start.
  useEffect(() => {
    api.get("/api/warmup").catch(() => {
      /* best-effort — sign-in retries on its own if the server is still waking */
    });
  }, []);

  const submit = async (form: HTMLFormElement) => {
    const fd = new FormData(form);
    const email = String(fd.get("email") || "");
    const password = String(fd.get("password") || "");
    const name = String(fd.get("name") || "");
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "login") await login(email, password);
      else await register(name, email, password);
      // On success the AuthProvider sets the user and the router swaps to the app.
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-subtle px-4 dark:bg-surface-dark">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-white">
            <PiggyBank size={22} />
          </span>
          <h1 className="text-lg font-semibold tracking-tight text-neutral-800 dark:text-neutral-100">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            {mode === "login" ? "Sign in to your finance tracker" : "Start tracking your money in seconds"}
          </p>
        </div>

        <div className="card p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(e.currentTarget);
            }}
            className="space-y-4"
          >
            {mode === "register" && (
              <FieldWrap label="Name">
                <Input name="name" placeholder="Your name" autoComplete="name" />
              </FieldWrap>
            )}

            <FieldWrap label="Email">
              <Input type="email" name="email" placeholder="you@example.com" autoComplete="email" required />
            </FieldWrap>

            <FieldWrap label="Password">
              <Input
                type="password"
                name="password"
                placeholder={mode === "register" ? "At least 6 characters" : "••••••••"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                minLength={mode === "register" ? 6 : undefined}
                required
              />
            </FieldWrap>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {slow && !error && (
              <p className="text-sm text-neutral-400">
                The server was asleep and is starting up. This can take up to a minute. Please keep this page open.
              </p>
            )}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-neutral-400">
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError(null);
              }}
              className="font-medium text-brand hover:underline"
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>

        {mode === "login" && (
          <p className="mt-4 text-center text-xs text-neutral-400">
            Demo login: <span className="font-medium">demo@finance.app</span> / <span className="font-medium">demo1234</span>
          </p>
        )}
      </div>
    </div>
  );
}
