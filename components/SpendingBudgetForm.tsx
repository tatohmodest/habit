"use client";

import { Loader2, PiggyBank } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function SpendingBudgetForm() {
  const router = useRouter();
  const [dailyLimit, setDailyLimit] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/spending/budget");
        if (!res.ok) return;
        const data = (await res.json()) as {
          budget: { dailyLimit?: string | null } | null;
        };
        if (cancelled) return;
        if (data.budget?.dailyLimit != null) {
          setDailyLimit(String(data.budget.dailyLimit));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const n = Number(dailyLimit.replace(/,/g, ""));
      if (Number.isNaN(n) || n <= 0) return;
      const res = await fetch("/api/spending/budget", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyLimit: n }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="size-6 animate-spin text-primary" aria-label="Loading" />
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-neutral-900">Daily budget</h3>
        <PiggyBank className="size-6 text-primary" aria-hidden />
      </div>
      <p className="mb-3 text-sm text-neutral-600">
        Set your daily spending cap (XAF). You can change it anytime.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-bold text-neutral-500">
            Daily limit (XAF)
          </label>
          <input
            required
            value={dailyLimit}
            onChange={(e) => setDailyLimit(e.target.value)}
            className="w-full rounded-lg border border-transparent bg-neutral-50 p-3 text-sm font-bold text-neutral-900 outline-none ring-primary focus:ring-2"
            inputMode="decimal"
            placeholder="10000"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-primary px-6 py-3 font-bold text-white shadow-md shadow-primary/20 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save budget"}
        </button>
      </div>
    </form>
  );
}
