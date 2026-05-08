"use client";

import { MinusCircle, PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Entry = {
  id: string;
  amount: string;
  note: string | null;
  createdAt: string;
};

function formatMoney(n: number, currency: string) {
  return `${Math.round(n).toLocaleString()} ${currency}`;
}

export function SavingsLedger({
  initialEntries,
  initialBalance,
  currency,
}: {
  initialEntries: Entry[];
  initialBalance: number;
  currency: string;
}) {
  const router = useRouter();
  const [entries, setEntries] = useState(initialEntries);
  const [balance, setBalance] = useState(initialBalance);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingType, setLoadingType] = useState<"add" | "subtract" | null>(null);

  async function createEntry(type: "add" | "subtract") {
    setError(null);
    const n = Number(amount.replace(/,/g, ""));
    if (!Number.isFinite(n) || n <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    setLoadingType(type);
    try {
      const res = await fetch("/api/savings/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, amount: n, note }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      const nextAmount = type === "add" ? n : -n;
      setBalance((b) => b + nextAmount);
      setEntries((prev) => [
        {
          id: crypto.randomUUID(),
          amount: String(nextAmount),
          note: note.trim() || null,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setAmount("");
      setNote("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setLoadingType(null);
    }
  }

  return (
    <section className="mx-auto w-full max-w-xl space-y-4 px-4 pb-24 pt-6">
      <div className="rounded-2xl border border-primary/20 bg-primary/10 p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">Total savings</p>
        <p className="mt-1 text-3xl font-black text-neutral-900">{formatMoney(balance, currency)}</p>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`Amount (${currency})`}
            inputMode="decimal"
            className="rounded-xl border border-neutral-200 px-3 py-2.5"
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="rounded-xl border border-neutral-200 px-3 py-2.5"
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => createEntry("add")}
            disabled={loadingType !== null}
            className="rounded-xl bg-green-600 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            <span className="inline-flex items-center gap-1">
              <PlusCircle className="size-4" /> Add
            </span>
          </button>
          <button
            type="button"
            onClick={() => createEntry("subtract")}
            disabled={loadingType !== null}
            className="rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            <span className="inline-flex items-center gap-1">
              <MinusCircle className="size-4" /> Subtract
            </span>
          </button>
        </div>
        {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">
          Savings activity
        </p>
        {entries.map((t) => {
          const signed = Number(t.amount);
          const isPlus = signed >= 0;
          return (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-xl border border-neutral-100 bg-white px-3 py-2.5"
            >
              <div>
                <p className="text-sm font-semibold text-neutral-800">
                  {t.note || (isPlus ? "Savings added" : "Savings used")}
                </p>
                <p className="text-[10px] text-neutral-500">{new Date(t.createdAt).toLocaleString()}</p>
              </div>
              <p className={`text-sm font-bold ${isPlus ? "text-green-700" : "text-red-700"}`}>
                {isPlus ? "+" : "-"}
                {formatMoney(Math.abs(signed), currency)}
              </p>
            </div>
          );
        })}
        {entries.length === 0 && <p className="text-sm text-neutral-500">No savings activity yet.</p>}
      </div>
    </section>
  );
}

