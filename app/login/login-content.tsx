"use client";

import { createBrowserClient } from "@supabase/ssr";
import { Loader2, Mail } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const err = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [localError, setLocalError] = useState<string | null>(null);

  async function requestOtp(targetMode: "signin" | "signup") {
    setMode(targetMode);
    setLocalError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          mode: targetMode,
        }),
      });

      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        const text = await res.text();
        throw new Error(
          `OTP endpoint returned non-JSON response (${res.status}). ${text.slice(0, 160)}`
        );
      }

      const payload = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Could not send OTP");
      setSent(true);
    } catch (e) {
      setSent(false);
      setLocalError(e instanceof Error ? e.message : "Could not send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    setLoading(true);
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const supabase = createBrowserClient(url, anon);
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp.trim(),
        type: mode === "signup" ? "signup" : "magiclink",
      });
      if (error) throw error;
      router.replace(next);
      router.refresh();
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Could not verify OTP");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--surface)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          {mode === "signup" ? "Create account" : "Sign in"}
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Enter your email, then use the one-time code sent to your inbox.
        </p>
        {!sent && (
          <div className="mt-5 grid grid-cols-2 rounded-xl bg-neutral-100 p-1">
            <button
              type="button"
              disabled={loading}
              onClick={() => setMode("signin")}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                mode === "signin"
                  ? "bg-white text-[var(--foreground)] shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => setMode("signup")}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                mode === "signup"
                  ? "bg-white text-[var(--foreground)] shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              Sign up
            </button>
          </div>
        )}

        {err && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>
        )}
        {localError && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {localError}
          </p>
        )}

        {sent ? (
          <form onSubmit={onVerify} className="mt-6 space-y-4">
            <p className="text-sm text-[var(--foreground)]">
              We sent a code to <strong>{email}</strong>.
            </p>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                One-time code
              </span>
              <input
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--foreground)] tracking-[0.35em] outline-none ring-[var(--accent)] focus:ring-2"
                placeholder="- - - - - - - - -"
                inputMode="numeric"
                autoComplete="one-time-code"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-3 font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
            >
              {loading ? <Loader2 className="size-5 animate-spin" /> : "Verify code"}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => requestOtp(mode)}
              className="w-full text-sm font-medium text-[var(--muted)] underline-offset-4 hover:underline disabled:opacity-60"
            >
              Resend code
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setSent(false);
                setOtp("");
              }}
              className="w-full text-sm font-medium text-[var(--muted)] underline-offset-4 hover:underline"
            >
              Use a different email
            </button>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              requestOtp(mode);
            }}
            className="mt-6 space-y-4"
          >
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Email
              </span>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-[var(--muted)]"
                  aria-hidden
                />
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-white py-3 pl-11 pr-4 text-[var(--foreground)] outline-none ring-[var(--accent)] focus:ring-2"
                  placeholder="you@example.com"
                />
              </div>
            </label>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-3 font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="size-5 animate-spin" />
              ) : mode === "signup" ? (
                "Sign up with OTP"
              ) : (
                "Sign in with OTP"
              )}
            </button>
          </form>
        )}
      </div>
      <p className="mt-8 text-center text-xs text-[var(--muted)]">
        By continuing you agree to use this app responsibly.
      </p>
    </div>
  );
}
