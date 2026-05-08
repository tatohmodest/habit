import { List, UserCircle } from "lucide-react";
import Link from "next/link";
import { SpendingBudgetForm } from "@/components/SpendingBudgetForm";
import { SpendingLogForm } from "@/components/SpendingLogForm";
import { loadTodaySnapshot } from "@/lib/data/today";
import { requireProfile } from "@/lib/session";

function formatMoney(n: number, currency: string) {
  return `${Math.round(n).toLocaleString()} ${currency}`;
}

export default async function SpendingPage() {
  const profile = await requireProfile();
  const data = await loadTodaySnapshot(profile.id);

  const limit = data.spending.dailyLimit;
  const hasBudget = limit != null && limit > 0;
  const spendPct =
    hasBudget && limit
      ? Math.min(100, (data.spending.totalSpent / limit) * 100)
      : 0;
  const remaining =
    hasBudget && limit != null ? Math.max(0, limit - data.spending.totalSpent) : null;

  const circumference = 2 * Math.PI * 80;
  const dashOffset = circumference * (1 - spendPct / 100);

  return (
    <div className="min-h-screen bg-background pb-28 text-foreground">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-neutral-200 bg-white p-4">
        <span className="text-neutral-400" aria-hidden>
          <List className="size-6" />
        </span>
        <h2 className="flex-1 text-center text-lg font-bold text-neutral-900">
          Spending tracker
        </h2>
        <span className="text-neutral-300" aria-hidden>
          <UserCircle className="size-6" />
        </span>
      </header>

      <main className="flex-1 pb-24">
        <section className="mb-2 flex flex-col items-center bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Today&apos;s spend
          </h3>
          <div className="relative flex items-center justify-center">
            <svg className="h-48 w-48">
              <circle
                className="text-neutral-200"
                cx="96"
                cy="96"
                fill="transparent"
                r="80"
                stroke="currentColor"
                strokeWidth="12"
              />
              <circle
                className="origin-center -rotate-90 text-primary transition-[stroke-dashoffset]"
                cx="96"
                cy="96"
                fill="transparent"
                r="80"
                stroke="currentColor"
                strokeDasharray={`${circumference}`}
                strokeDashoffset={hasBudget ? dashOffset : circumference}
                strokeLinecap="round"
                strokeWidth="12"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-extrabold text-neutral-900">
                {Math.round(data.spending.totalSpent).toLocaleString()}
              </span>
              <span className="text-xs font-medium text-neutral-500">
                {hasBudget && limit ? (
                  <>
                    / {Math.round(limit).toLocaleString()} {data.spending.currency}
                  </>
                ) : (
                  <>Set a daily limit below</>
                )}
              </span>
            </div>
          </div>
          <div className="mt-4 text-center">
            {hasBudget && remaining !== null ? (
              <p className="text-sm font-medium text-primary">
                {formatMoney(remaining, data.spending.currency)} remaining
              </p>
            ) : (
              <p className="text-sm text-neutral-600">
                Set a daily limit below — your budget is created on first save.
              </p>
            )}
          </div>
        </section>

        <section className="space-y-6 px-4 py-6">
          <SpendingBudgetForm />
          <SpendingLogForm />
        </section>

        <section className="px-4 pb-8">
          <h3 className="mb-4 px-1 text-lg font-bold text-neutral-900">Recent activity</h3>
          <div className="space-y-3">
            {data.spending.entries.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between rounded-xl border border-neutral-100 bg-white p-4 shadow-sm"
              >
                <div>
                  <p className="text-sm font-bold text-neutral-900">
                    {e.description || e.category}
                  </p>
                  <p className="text-[10px] font-medium uppercase text-neutral-400">
                    {e.category}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-extrabold text-neutral-900">
                    -{formatMoney(Number(e.amount), data.spending.currency)}
                  </p>
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      e.isNecessary
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {e.isNecessary ? "Necessary" : "Impulsive"}
                  </span>
                </div>
              </div>
            ))}
            {data.spending.entries.length === 0 && (
              <p className="text-sm text-neutral-500">No transactions today yet.</p>
            )}
          </div>
        </section>
      </main>
      <Link
        href="/spending/savings/access"
        className="fixed bottom-24 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-bold text-white shadow-xl shadow-primary/30 transition active:scale-95"
      >
        Private savings
      </Link>
    </div>
  );
}
