import { and, desc, eq } from "drizzle-orm";
import {
  format,
  getISOWeek,
  getISOWeekYear,
  parseISO,
  subDays,
  subWeeks,
} from "date-fns";
import { requireDb } from "@/lib/db";
import { habitLogs, habits, streaks } from "@/lib/db/schema";

function weekToken(d: Date): string {
  return `${getISOWeekYear(d)}-W${getISOWeek(d)}`;
}

export async function recalculateStreak(habitId: string, userId: string) {
  const db = requireDb();
  const [habit] = await db.select().from(habits).where(eq(habits.id, habitId));
  if (!habit) return 0;

  const logs = await db
    .select()
    .from(habitLogs)
    .where(
      and(eq(habitLogs.habitId, habitId), eq(habitLogs.status, "completed"))
    )
    .orderBy(desc(habitLogs.logDate));

  if (logs.length === 0) {
    await db
      .update(streaks)
      .set({
        currentStreak: 0,
        lastCompletedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(streaks.habitId, habitId));
    return 0;
  }

  const streakValue =
    habit.frequency === "weekly"
      ? computeWeeklyStreak(logs.map((l) => format(l.logDate, "yyyy-MM-dd")))
      : computeDailyStreak(logs.map((l) => format(l.logDate, "yyyy-MM-dd")));

  const [existing] = await db
    .select({ longestStreak: streaks.longestStreak })
    .from(streaks)
    .where(eq(streaks.habitId, habitId));

  const longest = Math.max(streakValue, existing?.longestStreak ?? 0);
  const lastLog = logs[0];

  await db
    .insert(streaks)
    .values({
      habitId,
      userId,
      currentStreak: streakValue,
      longestStreak: longest,
      totalCompletions: logs.length,
      lastCompletedAt: lastLog.logDate,
    })
    .onConflictDoUpdate({
      target: streaks.habitId,
      set: {
        currentStreak: streakValue,
        longestStreak: longest,
        totalCompletions: logs.length,
        lastCompletedAt: lastLog.logDate,
        updatedAt: new Date(),
      },
    });

  return streakValue;
}

function computeDailyStreak(completedDates: string[]): number {
  const logDateSet = new Set(completedDates);
  const today = format(new Date(), "yyyy-MM-dd");
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");

  let anchor = today;
  if (!logDateSet.has(today)) {
    if (!logDateSet.has(yesterday)) return 0;
    anchor = yesterday;
  }

  let streak = 0;
  let check = anchor;
  while (logDateSet.has(check)) {
    streak++;
    check = format(subDays(parseISO(check), 1), "yyyy-MM-dd");
  }
  return streak;
}

function computeWeeklyStreak(completedDates: string[]): number {
  const completedWeeks = new Set(
    completedDates.map((iso) => weekToken(parseISO(iso)))
  );

  let d = new Date();
  if (!completedWeeks.has(weekToken(d))) {
    d = subWeeks(d, 1);
  }
  if (!completedWeeks.has(weekToken(d))) {
    return 0;
  }

  let streak = 0;
  while (completedWeeks.has(weekToken(d))) {
    streak++;
    d = subWeeks(d, 1);
  }
  return streak;
}
