import { format, subDays } from "date-fns";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireDb } from "@/lib/db";
import { habitLogs, habits, profiles } from "@/lib/db/schema";
import { recalculateStreak } from "@/lib/habits/streaks";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const db = requireDb();
    const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
    const allProfiles = await db.select().from(profiles);

    for (const user of allProfiles) {
      const activeDaily = await db
        .select()
        .from(habits)
        .where(
          and(
            eq(habits.userId, user.id),
            eq(habits.isActive, true),
            eq(habits.frequency, "daily")
          )
        );

      const yesterdayLogs = await db
        .select()
        .from(habitLogs)
        .where(
          and(eq(habitLogs.userId, user.id), eq(habitLogs.logDate, yesterday))
        );

      const logged = new Set(yesterdayLogs.map((l) => l.habitId));

      for (const habit of activeDaily) {
        if (logged.has(habit.id)) continue;

        await db
          .insert(habitLogs)
          .values({
            habitId: habit.id,
            userId: user.id,
            logDate: yesterday,
            status: "missed",
          })
          .onConflictDoNothing({
            target: [habitLogs.habitId, habitLogs.logDate],
          });

        await recalculateStreak(habit.id, user.id);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
