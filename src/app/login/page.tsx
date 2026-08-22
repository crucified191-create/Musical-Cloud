"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GoogleIcon } from "@/components/icons";
import { useAuth, type OAuthProvider } from "@/components/auth-provider";
import { fetchEnabledOAuthProviders } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

const PROVIDERS: { id: OAuthProvider; label: string; icon: React.ReactNode }[] = [
  { id: "google", label: "Continue with Google", icon: <GoogleIcon className="h-4 w-4" /> },
];

function readableError(caught: unknown): string {
  return caught instanceof Error ? caught.message : "Something went wrong";
}

export default function LoginPage() {
  const { user, signIn, signUp, signInWithOAuth } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [enabledProviders, setEnabledProviders] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  useEffect(() => {
    fetchEnabledOAuthProviders().then(setEnabledProviders).catch(() => {});
  }, []);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  async function run(action: () => Promise<void>) {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await action();
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await run(async () => {
      if (mode === "signin") {
        await signIn(email, password);
        router.push("/");
        return;
      }
      const message = await signUp(email, password, displayName || email.split("@")[0]);
      if (message) setNotice(message);
      else router.push("/");
    });
  }

  const inputClass =
    "rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2.5 text-sm outline-none placeholder:text-neutral-500 focus:border-emerald-500";

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold">
          {mode === "signup" ? "Create an account" : "Sign in"}
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          {mode === "signup"
            ? "Pick a name — it shows on the playlists you share."
            : "Welcome back."}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {PROVIDERS.map((provider) => (
          <button
            key={provider.id}
            type="button"
            disabled={busy}
            onClick={() =>
              enabledProviders.has(provider.id)
                ? run(() => signInWithOAuth(provider.id))
                : setError(
                    `${provider.label.replace("Continue with ", "")} sign-in isn't switched on yet — enable it in Supabase → Authentication → Providers.`,
                  )
            }
            className="flex items-center justify-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2.5 text-sm font-medium transition hover:border-neutral-600 disabled:opacity-60"
          >
            {provider.icon}
            {provider.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 text-xs text-neutral-600">
        <span className="h-px flex-1 bg-neutral-800" />
        or
        <span className="h-px flex-1 bg-neutral-800" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {mode === "signup" ? (
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Display name"
            autoComplete="nickname"
            className={inputClass}
          />
        ) : null}
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          autoComplete="email"
          className={inputClass}
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          className={inputClass}
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-60"
        >
          {busy ? "Working…" : mode === "signup" ? "Sign up" : "Sign in"}
        </button>
      </form>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-400">{notice}</p> : null}

      <div className="flex flex-col gap-2 text-sm text-neutral-400">
        <button
          type="button"
          onClick={() => switchMode(mode === "signup" ? "signin" : "signup")}
          className="text-left transition hover:text-white"
        >
          {mode === "signup" ? "Already have an account? Sign in" : "No account? Sign up"}
        </button>
        <Link href="/browse" className="text-neutral-500 transition hover:text-white">
          Or browse public playlists without an account
        </Link>
      </div>
    </div>
  );
}
