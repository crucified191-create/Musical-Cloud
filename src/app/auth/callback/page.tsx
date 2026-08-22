"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

function Callback() {
  const router = useRouter();
  const params = useSearchParams();
  const [failed, setFailed] = useState(false);
  const providerError = params.get("error_description");

  useEffect(() => {
    if (!isSupabaseConfigured || providerError) return;

    const supabase = getSupabaseClient();
    const code = params.get("code");

    async function finish() {
      if (code) await supabase.auth.exchangeCodeForSession(code);
      const { data } = await supabase.auth.getSession();
      if (data.session) router.replace("/");
      else setFailed(true);
    }

    finish().catch(async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) router.replace("/");
      else setFailed(true);
    });
  }, [params, providerError, router]);

  const error = providerError ?? (failed ? "Sign-in did not complete. Try again." : null);

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      {error ? (
        <>
          <p className="text-sm text-red-400">{error}</p>
          <Link href="/login" className="text-sm text-neutral-400 transition hover:text-white">
            Back to sign in
          </Link>
        </>
      ) : (
        <p className="text-sm text-neutral-400">Signing you in…</p>
      )}
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <Callback />
    </Suspense>
  );
}
