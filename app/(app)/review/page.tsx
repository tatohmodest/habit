import {
  endOfISOWeek,
  format,
  getISOWeek,
  isValid,
  parseISO,
  startOfISOWeek,
  subWeeks,
} from "date-fns";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { ArrowLeft, CheckCircle2, Flame, TrendingUp } from "lucide-react";
import Link from "next/link";
import { requireDb } from "@/lib/db";
import { habitLogs, habits, spendingEntries, weeklyReviews } from "@/lib/db/schema";
import { getWeeklyReflectionPrompt } from "@/lib/review/prompts";
import { requireProfile } from "@/lib/session";

export default async function ReviewPage() {
  const profile = await requireProfile();
  const db = requireDb();

  const weekStartDate = startOfISOWeek(new Date());
  const weekEndDate = endOfISOWeek(new Date());
  const prevWeekStartDate = subWeeks(weekStartDate, 1);
  const prevWeekEndDate = endOfISOWeek(prevWeekStartDate);

  const weekStart = format(weekStartDate, "yyyy-MM-dd");
  const weekEnd = format(weekEndDate, "yyyy-MM-dd");
  const prevWeekStart = format(prevWeekStartDate, "yyyy-MM-dd");
  const prevWeekEnd = format(prevWeekEndDate, "yyyy-MM-dd");

  const [activeHabits, currentLogs, prevLogs, spendRows, reviewRows] = await Promise.all([
    db
      .select({ id: habits.id })
      .from(habits)
      .where(and(eq(habits.userId, profile.id), eq(habits.isActive, true))),
    db
      .select({ status: habitLogs.status, logDate: habitLogs.logDate })
      .from(habitLogs)
      .where(
        and(
          eq(habitLogs.userId, profile.id),
          gte(habitLogs.logDate, weekStart),
          lte(habitLogs.logDate, weekEnd)
        )
      ),
    db
      .select({ status: habitLogs.status })
      .from(habitLogs)
      .where(
        and(
          eq(habitLogs.userId, profile.id),
          gte(habitLogs.logDate, prevWeekStart),
          lte(habitLogs.logDate, prevWeekEnd)
        )
      ),
    db
      .select({ amount: spendingEntries.amount })
      .from(spendingEntries)
      .where(
        and(
          eq(spendingEntries.userId, profile.id),
          gte(spendingEntries.logDate, weekStart),
          lte(spendingEntries.logDate, weekEnd)
        )
      ),
    db
      .select({
        weekStart: weeklyReviews.weekStart,
        weekEnd: weeklyReviews.weekEnd,
        reflection: weeklyReviews.reflection,
      })
      .from(weeklyReviews)
      .where(eq(weeklyReviews.userId, profile.id))
      .orderBy(desc(weeklyReviews.weekStart))
      .limit(8),
  ]);

  const totalHabits = activeHabits.length;
  const expectedCompletions = Math.max(totalHabits * 7, 1);
  const completed = currentLogs.filter((l) => l.status === "completed").length;
  const pending = Math.max(expectedCompletions - completed, 0);
  const score = Math.min(100, Math.round((completed / expectedCompletions) * 100));

  const prevExpected = expectedCompletions;
  const prevCompleted = prevLogs.filter((l) => l.status === "completed").length;
  const prevScore = Math.min(100, Math.round((prevCompleted / prevExpected) * 100));
  const trend = score - prevScore;

  const weekSpent = spendRows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const completedDayCount = new Set(
    currentLogs.filter((l) => l.status === "completed").map((l) => l.logDate)
  ).size;

  const reflectionEntries = reviewRows
    .filter((r) => (r.reflection ?? "").trim().length > 0)
    .map((r) => ({
      range: `${formatDateShort(r.weekStart)} - ${formatDateShort(r.weekEnd)}`,
      summary: (r.reflection ?? "").trim(),
      weekStart: r.weekStart,
    }));

  const reviewStreak = calcReviewStreak(reviewRows.map((r) => r.weekStart));
  const reflectionPrompt = getWeeklyReflectionPrompt(profile.id, weekStartDate);

  const weekNum = getISOWeek(new Date());
  const ring = 2 * Math.PI * 88;
  const dashOffset = ring * (1 - score / 100);

  return (
    <div className="min-h-screen bg-background pb-28 font-display text-foreground">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex size-10 items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-100"
            aria-label="Back home"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="text-xl font-extrabold uppercase tracking-tight text-neutral-900">
            Sunday reflection
          </h1>
        </div>
        <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
          Week {weekNum}
        </div>
      </header>

      <main className="mx-auto max-w-xl pb-32">
        <section className="p-6">
          <div className="flex flex-col items-center rounded-xl border border-neutral-200 bg-neutral-900 p-8 text-center text-white shadow-xl">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-neutral-400">
              Weekly discipline score
            </p>
            <div className="relative flex items-center justify-center">
              <svg className="size-48 -rotate-90 transform">
                <circle
                  className="text-white/10"
                  cx="96"
                  cy="96"
                  fill="transparent"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="8"
                />
                <circle
                  className="text-primary"
                  cx="96"
                  cy="96"
                  fill="transparent"
                  r="88"
                  stroke="currentColor"
                  strokeDasharray={ring}
                  strokeDashoffset={dashOffset}
                  strokeWidth="12"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-6xl font-extrabold tracking-tighter">{score}</span>
                <span className="text-sm font-bold uppercase text-neutral-400">/ 100</span>
              </div>
            </div>
            <p className="mt-6 max-w-xs text-sm italic leading-relaxed text-neutral-300">
              Based on your real check-ins this week.
            </p>
          </div>
        </section>

        <section className="px-6">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-neutral-200 bg-white p-4 text-center shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                Completed
              </p>
              <p className="mt-2 text-2xl font-black text-neutral-900">{completed}</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-4 text-center shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                Pending
              </p>
              <p className="mt-2 text-2xl font-black text-neutral-900">{pending}</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-4 text-center shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                Trend
              </p>
              <p
                className={`mt-2 inline-flex items-center gap-1 text-2xl font-black ${
                  trend >= 0 ? "text-primary" : "text-red-600"
                }`}
              >
                <TrendingUp className="size-5" />
                {trend >= 0 ? `+${trend}` : trend}
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-primary/20 bg-primary/10 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-primary">
              Weekly reflection prompt
            </p>
            <p className="mt-2 text-sm font-medium text-neutral-700">{reflectionPrompt}</p>
          </div>
        </section>

        <section className="mt-6 px-6">
          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Week snapshot
            </p>
            <p className="mt-2 text-sm text-neutral-700">
              You completed <span className="font-bold text-neutral-900">{completed}</span> habit
              checks across <span className="font-bold text-neutral-900">{completedDayCount}</span>{" "}
              active days and logged{" "}
              <span className="font-bold text-neutral-900">
                {Math.round(weekSpent).toLocaleString()} XAF
              </span>{" "}
              in spending.
            </p>
          </div>
        </section>

        <section className="mt-6 px-6">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-2xl font-extrabold uppercase leading-none tracking-tight text-neutral-900">
              Ownership log
            </h2>
          </div>
          <div className="space-y-4">
            {reflectionEntries.map((e) => (
              <div
                key={e.weekStart}
                className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                      {e.range}
                    </span>
                    <h3 className="font-extrabold text-lg text-neutral-900">
                      Week snapshot
                    </h3>
                  </div>
                  <CheckCircle2 className="size-5 text-accent-green" />
                </div>
                <p className="border-l-4 border-neutral-100 pl-4 text-sm italic leading-relaxed text-neutral-600">
                  "{e.summary}"
                </p>
              </div>
            ))}
            {reflectionEntries.length === 0 && (
              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <p className="text-sm text-neutral-600">
                  No reflection entries yet. Save your first weekly reflection to start your
                  ownership log.
                </p>
              </div>
            )}
            {reviewStreak > 0 && (
              <div className="rounded-xl border border-neutral-200 bg-gradient-to-r from-orange-50 to-white p-4">
                <p className="inline-flex items-center gap-2 text-sm font-bold text-primary">
                  <Flame className="size-4" />
                  Review streak: {reviewStreak} week{reviewStreak > 1 ? "s" : ""}
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function formatDateShort(value: string | Date) {
  const date = typeof value === "string" ? parseISO(value) : value;
  if (!isValid(date)) return "";
  return format(date, "MMM d");
}

function calcReviewStreak(weekStarts: Array<string | Date>) {
  if (!weekStarts.length) return 0;
  const normalized = weekStarts
    .map((w) => {
      const date = typeof w === "string" ? parseISO(w) : w;
      if (!isValid(date)) return null;
      return format(startOfISOWeek(date), "yyyy-MM-dd");
    })
    .filter((x): x is string => Boolean(x))
    .sort((a, b) => (a > b ? -1 : 1));
  if (!normalized.length) return 0;

  let streak = 0;
  let cursor = format(startOfISOWeek(new Date()), "yyyy-MM-dd");
  const set = new Set(normalized);
  while (set.has(cursor)) {
    streak += 1;
    cursor = format(subWeeks(parseISO(cursor), 1), "yyyy-MM-dd");
  }
  return streak;
}
