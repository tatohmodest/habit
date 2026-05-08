import { format } from "date-fns";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireDb } from "@/lib/db";
import { habitLogs, habits } from "@/lib/db/schema";
import { recalculateStreak } from "@/lib/habits/streaks";
import { getProfileForApi } from "@/lib/session";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const profile = await getProfileForApi();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const db = requireDb();

    const [habit] = await db
      .select()
      .from(habits)
      .where(and(eq(habits.id, id), eq(habits.userId, profile.id)));

    if (!habit) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let note: string | undefined;
    try {
      const body = await req.json();
      if (typeof body?.note === "string") note = body.note;
    } catch {
      /* empty body */
    }

    const today = format(new Date(), "yyyy-MM-dd");

    await db
      .insert(habitLogs)
      .values({
        habitId: id,
        userId: profile.id,
        logDate: today,
        status: "completed",
        completedAt: new Date(),
        note,
      })
      .onConflictDoUpdate({
        target: [habitLogs.habitId, habitLogs.logDate],
        set: {
          status: "completed",
          completedAt: new Date(),
          note,
        },
      });

    const streak = await recalculateStreak(id, profile.id);
    return NextResponse.json({ success: true, streak });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
