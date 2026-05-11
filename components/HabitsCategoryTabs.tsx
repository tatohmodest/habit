"use client";

import { Pencil } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { loadTodaySnapshot } from "@/lib/data/today";
import { CompleteHabitButton } from "@/components/CompleteHabitButton";
import { HabitLinkedText } from "@/components/HabitLinkedText";
import { HabitIcon } from "@/components/HabitIcon";

type HabitRow = Awaited<ReturnType<typeof loadTodaySnapshot>>["habits"][number];

const tabs = ["spiritual", "financial", "behavioral", "discipline"] as const;

export function HabitsCategoryTabs({ habits }: { habits: HabitRow[] }) {
  const [tab, setTab] = useState<(typeof tabs)[number]>("spiritual");

  const filtered = useMemo(
    () => habits.filter((h) => h.category === tab),
    [habits, tab]
  );

  return (
    <>
      <div className="border-b border-neutral-200 bg-white">
        <div className="flex gap-6 overflow-x-auto px-4">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`whitespace-nowrap border-b-2 pb-3 pt-4 text-sm font-bold capitalize ${
                tab === t
                  ? "border-primary text-primary"
                  : "border-transparent text-neutral-500"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 p-4">
        <section className="mb-8">
          <h3 className="mb-4 text-lg font-bold capitalize text-neutral-900">
            {tab} habits
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {filtered.map((h) => (
              <div
                key={h.id}
                className="flex items-center gap-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-primary">
                  <HabitIcon name={h.iconKey} className="size-6" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center">
                  <p className="line-clamp-1 text-base font-bold text-neutral-900">
                    <HabitLinkedText text={h.name} />
                  </p>
                  <p className="text-xs font-normal text-neutral-500">
                    Streak: {h.streak?.currentStreak ?? 0} days
                  </p>
                </div>
                <Link
                  href={`/habits/${h.id}/edit`}
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-primary"
                  aria-label={`Edit ${h.name}`}
                >
                  <Pencil className="size-4" />
                </Link>
                <CompleteHabitButton
                  habitId={h.id}
                  completed={h.isCompleted}
                  disabled={h.type === "threshold"}
                />
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-neutral-500">No habits in this category.</p>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
