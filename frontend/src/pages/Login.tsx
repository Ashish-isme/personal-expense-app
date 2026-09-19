import { useEffect, useRef, useState } from "react";
import { Loader2, PiggyBank } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useSlowHint } from "@/lib/useSlowHint";
import { prefersReducedMotion } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormError, FormField } from "@/components/app/FormField";

/** Combined sign-in / sign-up screen shown when there is no active session. */
export function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const slow = useSlowHint(submitting);
  const ref = useRef<HTMLDivElement>(null);

  // Start waking the server and database while the user is still typing, so
  // the sign-in itself doesn't have to wait for a cold start.
  useEffect(() => {
    api.get("/api/warmup").catch(() => {
      /* best-effort — sign-in retries on its own if the server is still waking */
    });
  }, []);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(ref.current!.children, { opacity: 0, y: 10, duration: 0.45, ease: "power2.out", stagger: 0.06 });
    },
    { scope: ref }
  );

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

  const isLogin = mode === "login";

  return (
    <div className="bg-muted/40 flex min-h-svh items-center justify-center px-4 py-10">
      <div ref={ref} className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-xl">
            <PiggyBank className="size-5" />
          </span>
          <span className="text-sm font-semibold tracking-tight">Finance</span>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">{isLogin ? "Welcome back" : "Create your account"}</CardTitle>
            <CardDescription>
              {isLogin ? "Sign in to your finance tracker" : "Start tracking your money in seconds"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit(e.currentTarget);
              }}
              className="grid gap-4"
            >
              {!isLogin && (
                <FormField label="Name" htmlFor="name">
                  <Input id="name" name="name" placeholder="Your name" autoComplete="name" />
                </FormField>
              )}
              <FormField label="Email" htmlFor="email">
                <Input id="email" type="email" name="email" placeholder="you@example.com" autoComplete="email" required />
              </FormField>
              <FormField label="Password" htmlFor="password">
                <Input
                  id="password"
                  type="password"
                  name="password"
                  placeholder={isLogin ? "••••••••" : "At least 6 characters"}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  minLength={isLogin ? undefined : 6}
                  required
                />
              </FormField>

              <FormError message={error} />
              {slow && !error && (
                <p className="text-muted-foreground text-sm">
                  The server was asleep and is starting up. This can take up to a minute — please keep this page open.
                </p>
              )}

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting && <Loader2 className="animate-spin" />}
                {submitting ? "Please wait…" : isLogin ? "Sign in" : "Create account"}
              </Button>
            </form>

            <p className="text-muted-foreground mt-6 text-center text-sm">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => {
                  setMode(isLogin ? "register" : "login");
                  setError(null);
                }}
                className="text-foreground font-medium underline-offset-4 hover:underline"
              >
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </p>
          </CardContent>
        </Card>

        {isLogin && (
          <p className="text-muted-foreground text-center text-xs">
            Demo login: <span className="text-foreground font-medium">demo@finance.app</span> /{" "}
            <span className="text-foreground font-medium">demo1234</span>
          </p>
        )}
      </div>
    </div>
  );
}
