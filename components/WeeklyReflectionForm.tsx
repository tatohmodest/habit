"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function WeeklyReflectionForm({
  initialReflection,
  initialScore,
}: {
  initialReflection: string;
  initialScore: number | null;
}) {
  const router = useRouter();
  const [reflection, setReflection] = useState(initialReflection);
  const [score, setScore] = useState(initialScore ?? 84);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reflection, score }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <p className="text-sm font-medium text-red-600">{error}</p>
      )}
      <label className="block">
        <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
          Did I take ownership this week?
        </span>
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          rows={5}
          className="w-full rounded-xl border border-gray-200 p-4 text-sm leading-relaxed text-gray-700 focus:border-primary focus:outline-none"
          placeholder="Write the honest answer."
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
          Discipline score (0–100)
        </span>
        <input
          type="number"
          min={0}
          max={100}
          value={score}
          onChange={(e) => setScore(Number(e.target.value))}
          className="w-full rounded-xl border border-gray-200 p-3 font-bold focus:border-primary focus:outline-none"
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-primary py-4 font-extrabold uppercase tracking-widest text-white shadow-lg shadow-primary/20 transition-all hover:brightness-110 disabled:opacity-60"
      >
        {loading ? "Saving…" : "Save reflection"}
      </button>
    </form>
  );
}
