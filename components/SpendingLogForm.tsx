"use client";

import { Receipt } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SpendingLogForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [description, setDescription] = useState("");
  const [necessary, setNecessary] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/spending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount.replace(/,/g, "")),
          category,
          description,
          isNecessary: necessary,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setAmount("");
      setDescription("");
      await queryClient.invalidateQueries({ queryKey: ["logs", "today"] });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-neutral-900">Quick log</h3>
        <span className="text-primary">
          <Receipt className="size-6" aria-hidden />
        </span>
      </div>
      {error && (
        <p className="mb-3 text-sm font-medium text-red-600">{error}</p>
      )}
      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-bold text-neutral-500">
              Amount (XAF)
            </label>
            <input
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-transparent bg-neutral-50 p-3 text-sm font-bold text-neutral-900 outline-none ring-primary focus:ring-2"
              inputMode="decimal"
              placeholder="2,000"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-bold text-neutral-500">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-transparent bg-neutral-50 p-3 text-sm text-neutral-900 outline-none ring-primary focus:ring-2"
            >
              <option>Food</option>
              <option>Transport</option>
              <option>Bills</option>
              <option>Fun</option>
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-neutral-500">
            Note
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-transparent bg-neutral-50 p-3 text-sm text-neutral-900 outline-none ring-primary focus:ring-2"
            placeholder="What was it?"
          />
        </div>
        <div className="flex items-center justify-between rounded-lg bg-neutral-50 p-3">
          <span className="text-sm font-medium text-neutral-600">
            Was this necessary?
          </span>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={necessary}
              onChange={(e) => setNecessary(e.target.checked)}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-neutral-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-neutral-300 after:bg-white after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white" />
          </label>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-primary py-3 font-bold text-white shadow-lg shadow-primary/20 transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? "Saving…" : "Add transaction"}
        </button>
      </div>
    </form>
  );
}
