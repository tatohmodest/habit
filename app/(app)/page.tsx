import { getHours } from "date-fns";
import {
  Bell,
  CheckCircle2,
  Diamond,
  Clock,
  Flame,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { CompleteHabitButton } from "@/components/CompleteHabitButton";
import { HabitLinkedText } from "@/components/HabitLinkedText";
import { DailyVerseCard } from "@/components/DailyVerseCard";
import { HabitIcon } from "@/components/HabitIcon";
import { AvatarUploader } from "@/components/AvatarUploader";
import { getBibleProgress } from "@/lib/bible/streak";
import { loadTodaySnapshot } from "@/lib/data/today";
import { requireProfile } from "@/lib/session";

function formatMoney(n: number, currency: string) {
  return `${Math.round(n).toLocaleString()} ${currency}`;
}

export default async function HomePage() {
  const profile = await requireProfile();
  const data = await loadTodaySnapshot(profile.id);
  const bibleProgress = await getBibleProgress(profile.id);

  const pinned = data.habits.filter((h) => h.isPinned);
  const streakStrip = pinned.slice(0, 4);

  const spendLimit = data.spending.dailyLimit;
  const hasBudget = spendLimit != null && spendLimit > 0;
  const spendPct =
    hasBudget && spendLimit
      ? Math.min(100, (data.spending.totalSpent / spendLimit) * 100)
      : 0;
  const remaining =
    hasBudget && spendLimit != null
      ? Math.max(0, spendLimit - data.spending.totalSpent)
      : null;

  const dailyForFocus = data.habits.filter((h) => h.frequency === "daily");
  const pending = dailyForFocus.filter((h) => !h.isCompleted);
  const done = dailyForFocus.filter((h) => h.isCompleted);

  const hour = getHours(new Date());
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const displayName = profile.displayName?.trim() || "there";
  const shortName = displayName.split(/\s+/)[0] ?? displayName;

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background pb-28 text-foreground">
      {/* Fixed (not sticky): parent overflow-x-hidden breaks sticky on many mobile browsers */}
      <header className="fixed inset-x-0 top-0 z-50 flex items-center gap-3 border-b border-neutral-200 bg-white/95 px-4 pb-3 pt-safe shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/90">
        <AvatarUploader avatarUrl={profile.avatarUrl ?? null} />
        <h2 className="min-w-0 flex-1 text-lg font-bold leading-tight tracking-tight">
          {greeting}, {shortName}
        </h2>
        <Link
          href="/habits/new"
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-primary"
          aria-label="Add habit"
        >
          <Plus className="size-6" />
        </Link>
        <div className="flex shrink-0 items-center justify-end gap-2 text-neutral-400">
          <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2 py-1 text-xs font-bold text-cyan-700">
            <Diamond className="size-3.5" aria-hidden />
            {bibleProgress.diamonds}
          </span>
          <Link
            href="/habits"
            className="flex size-10 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-primary"
            aria-label="Habits and reminders"
          >
            <Bell className="size-5" aria-hidden />
          </Link>
        </div>
      </header>
      {/* Reserve space: pt-safe + pb-3 + h-10 row */}
      <div
        className="shrink-0"
        style={{
          height: "calc(3.25rem + env(safe-area-inset-top, 0px))",
        }}
        aria-hidden
      />

      <DailyVerseCard />

      <section className="px-4 py-2">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Your streaks</h2>
          <span className="flex items-center gap-1 text-sm font-bold text-primary">
            <Flame className="size-4" aria-hidden />
            Stay sharp
          </span>
        </div>

        {streakStrip.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-6 text-center">
            <p className="text-sm text-neutral-600">
              Pin habits from the habits list to spotlight streaks here.
            </p>
            <Link
              href="/habits/new"
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white"
            >
              <Plus className="size-4" aria-hidden />
              Create a habit
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {streakStrip.map((h) => (
              <div
                key={h.id}
                className="flex min-w-[140px] flex-1 flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-transform active:scale-[0.98]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-orange-50 text-primary">
                      <HabitIcon name={h.iconKey} className="size-5" />
                    </div>
                    <p className="text-sm font-medium text-neutral-800">
                      <HabitLinkedText text={h.name} />
                    </p>
                  </div>
                  <Flame className="size-5 shrink-0 text-primary" aria-hidden />
                </div>
                <p className="streak-glow text-3xl font-extrabold leading-tight tracking-tight text-neutral-900">
                  {h.streak?.currentStreak ?? 0}{" "}
                  <span className="text-sm font-medium text-neutral-500">days</span>
                </p>
                <p className="text-xs font-bold leading-normal text-accent-green">
                  {h.isCompleted ? "+1 today" : "Still open today"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Today&apos;s focus</h2>
          <p className="text-xs font-medium text-neutral-500">
            {pending.length} remaining
          </p>
        </div>

        {data.habits.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
            <p className="text-neutral-700">
              No habits yet. Build your streak engine — start with one daily ritual.
            </p>
            <Link
              href="/habits/new"
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-white shadow-md shadow-primary/20"
            >
              <Plus className="size-5" aria-hidden />
              Create your first habit
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((h) => (
              <div
                key={h.id}
                className="flex items-center gap-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-primary">
                  <HabitIcon name={h.iconKey} className="size-6" />
                </div>
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="text-base font-bold text-neutral-900">
                      <HabitLinkedText text={h.name} />
                    </h3>
                    <span className="rounded border border-primary px-1.5 text-[10px] font-black uppercase text-primary">
                      open
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <Clock className="size-3.5" aria-hidden />
                    Window ends {String(h.windowEnd).slice(0, 5)}
                  </div>
                </div>
                <CompleteHabitButton
                  habitId={h.id}
                  completed={false}
                  disabled={h.type === "threshold"}
                />
              </div>
            ))}
            {done.map((h) => (
              <div
                key={h.id}
                className="flex items-center gap-4 rounded-xl border border-accent-green/25 bg-green-50/80 p-4"
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-accent-green">
                  <CheckCircle2 className="size-6" aria-hidden />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-neutral-500 line-through">
                    <HabitLinkedText text={h.name} />
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-accent-green">
                    <CheckCircle2 className="size-3.5" aria-hidden />
                    Done today
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="px-4 pb-24">
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50/80 p-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Daily spending limit
              </p>
              {hasBudget ? (
                <p className="text-xl font-bold text-neutral-900">
                  {formatMoney(spendLimit!, data.spending.currency)}
                </p>
              ) : (
                <p className="text-sm font-medium text-neutral-600">
                  No budget set yet — save one on the Spending tab.
                </p>
              )}
            </div>
            <div className="text-right">
              {hasBudget && remaining !== null ? (
                <>
                  <p className="text-xl font-bold text-accent-green">
                    {formatMoney(remaining, data.spending.currency)} left
                  </p>
                  <p className="text-[10px] text-neutral-500">Today</p>
                </>
              ) : (
                <Link href="/spending" className="text-sm font-semibold text-primary">
                  Set budget
                </Link>
              )}
            </div>
          </div>
          {hasBudget && (
            <div className="p-5">
              <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{ width: `${spendPct}%` }}
                />
              </div>
              <div className="flex justify-between text-xs font-medium">
                <span className="text-neutral-500">
                  Spent:{" "}
                  {formatMoney(data.spending.totalSpent, data.spending.currency)}
                </span>
                <span className="text-primary">{Math.round(spendPct)}% of limit</span>
              </div>
            </div>
          )}
          <div className="space-y-2 px-5 pb-5">
            {data.spending.entries.slice(0, 4).map((e) => (
              <div
                key={e.id}
                className="flex justify-between border-t border-neutral-100 py-2 text-xs first:border-0 first:pt-0"
              >
                <span className="text-neutral-700">{e.description || e.category}</span>
                <span className="font-mono text-neutral-900">
                  {formatMoney(Number(e.amount), data.spending.currency)}
                </span>
              </div>
            ))}
            {data.spending.entries.length === 0 && (
              <p className="text-xs text-neutral-500">No spends logged yet today.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
