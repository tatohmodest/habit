import { endOfISOWeek, format, startOfISOWeek } from "date-fns";
import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { requireDb } from "@/lib/db";
import {
  habitLogs,
  habits,
  spendingBudgets,
  spendingEntries,
  streaks,
} from "@/lib/db/schema";

export async function loadTodaySnapshot(userId: string) {
  const db = requireDb();
  const today = format(new Date(), "yyyy-MM-dd");
  const emptySnapshot = {
    date: today,
    habits: [] as Array<
      typeof habits.$inferSelect & {
        streak: typeof streaks.$inferSelect | null;
        todayLog: typeof habitLogs.$inferSelect | null;
        isCompleted: boolean;
      }
    >,
    pendingCount: 0,
    spending: {
      totalSpent: 0,
      dailyLimit: null as number | null,
      entries: [] as Array<typeof spendingEntries.$inferSelect>,
      currency: "XAF",
    },
  };

  try {
    const habitRows = await db
      .select({
        habit: habits,
        streak: streaks,
      })
      .from(habits)
      .leftJoin(streaks, eq(streaks.habitId, habits.id))
      .where(and(eq(habits.userId, userId), eq(habits.isActive, true)))
      .orderBy(asc(habits.sortOrder));

    const weeklyHabitIds = habitRows
      .filter((r) => r.habit.frequency === "weekly")
      .map((r) => r.habit.id);

    const weekStart = format(
      startOfISOWeek(new Date()),
      "yyyy-MM-dd"
    );
    const weekEnd = format(
      endOfISOWeek(new Date()),
      "yyyy-MM-dd"
    );

    const weeklyDoneIds = new Set<string>();
    if (weeklyHabitIds.length > 0) {
      const wLogs = await db
        .select()
        .from(habitLogs)
        .where(
          and(
            eq(habitLogs.userId, userId),
            eq(habitLogs.status, "completed"),
            gte(habitLogs.logDate, weekStart),
            lte(habitLogs.logDate, weekEnd),
            inArray(habitLogs.habitId, weeklyHabitIds)
          )
        );
      for (const l of wLogs) weeklyDoneIds.add(l.habitId);
    }

    const logs = await db
      .select()
      .from(habitLogs)
      .where(and(eq(habitLogs.userId, userId), eq(habitLogs.logDate, today)));

    const logByHabit = new Map(logs.map((l) => [l.habitId, l]));

    const spendingToday = await db
      .select()
      .from(spendingEntries)
      .where(
        and(eq(spendingEntries.userId, userId), eq(spendingEntries.logDate, today))
      );

    const totalSpent = spendingToday.reduce((s, e) => s + Number(e.amount), 0);

    const [budget] = await db
      .select()
      .from(spendingBudgets)
      .where(
        and(
          eq(spendingBudgets.userId, userId),
          eq(spendingBudgets.isActive, true)
        )
      );

    const dailyLimit =
      budget?.dailyLimit != null && budget.dailyLimit !== ""
        ? Number(budget.dailyLimit)
        : null;

    const enriched = habitRows.map(({ habit, streak }) => {
      const log = logByHabit.get(habit.id);
      let completed = log?.status === "completed";

      if (habit.frequency === "weekly") {
        completed = weeklyDoneIds.has(habit.id);
      } else if (habit.type === "threshold") {
        completed = completed || spendingToday.length > 0;
      }

      return {
        ...habit,
        streak,
        todayLog: log ?? null,
        isCompleted: completed,
      };
    });

    const pendingCount = enriched.filter((h) => {
      if (h.frequency === "weekly") return !h.isCompleted;
      if (h.type === "threshold") return !h.isCompleted;
      return !h.isCompleted;
    }).length;

    return {
      date: today,
      habits: enriched,
      pendingCount,
      spending: {
        totalSpent,
        dailyLimit,
        entries: spendingToday,
        currency: budget?.currency ?? "XAF",
      },
    };
  } catch {
    return emptySnapshot;
  }
}
