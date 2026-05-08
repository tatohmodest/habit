import { format } from "date-fns";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireDb } from "@/lib/db";
import {
  habitLogs,
  habits,
  spendingBudgets,
  spendingEntries,
} from "@/lib/db/schema";
import { recalculateStreak } from "@/lib/habits/streaks";
import { sendFCMNotification } from "@/lib/notifications/fcm";
import { getProfileForApi } from "@/lib/session";

export async function GET() {
  try {
    const profile = await getProfileForApi();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const db = requireDb();
    const today = format(new Date(), "yyyy-MM-dd");

    const entries = await db
      .select()
      .from(spendingEntries)
      .where(
        and(eq(spendingEntries.userId, profile.id), eq(spendingEntries.logDate, today))
      );

    const [budget] = await db
      .select()
      .from(spendingBudgets)
      .where(
        and(
          eq(spendingBudgets.userId, profile.id),
          eq(spendingBudgets.isActive, true)
        )
      );

    const total = entries.reduce((s, e) => s + Number(e.amount), 0);
    const dailyLimit = budget?.dailyLimit ? Number(budget.dailyLimit) : null;

    return NextResponse.json({
      date: today,
      entries,
      totalSpent: total,
      dailyLimit,
      currency: budget?.currency ?? "XAF",
      alertAtPercent: budget?.alertAtPercent ?? 80,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function POST(req: Request) {
  try {
    const profile = await getProfileForApi();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const db = requireDb();
    const body = await req.json();
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const category = typeof body.category === "string" ? body.category : "Other";
    const description =
      typeof body.description === "string" ? body.description : "";
    const isNecessary = Boolean(body.isNecessary);

    const today = format(new Date(), "yyyy-MM-dd");

    await db.insert(spendingEntries).values({
      userId: profile.id,
      amount: String(amount),
      category,
      description,
      isNecessary,
      logDate: today,
    });

    const [thresholdHabit] = await db
      .select()
      .from(habits)
      .where(
        and(
          eq(habits.userId, profile.id),
          eq(habits.type, "threshold"),
          eq(habits.isActive, true)
        )
      )
      .limit(1);

    if (thresholdHabit) {
      await db
        .insert(habitLogs)
        .values({
          habitId: thresholdHabit.id,
          userId: profile.id,
          logDate: today,
          status: "completed",
          completedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [habitLogs.habitId, habitLogs.logDate],
          set: {
            status: "completed",
            completedAt: new Date(),
          },
        });
      await recalculateStreak(thresholdHabit.id, profile.id);
    }

    const allToday = await db
      .select()
      .from(spendingEntries)
      .where(
        and(eq(spendingEntries.userId, profile.id), eq(spendingEntries.logDate, today))
      );

    const totalToday = allToday.reduce((s, e) => s + Number(e.amount), 0);

    const [budget] = await db
      .select()
      .from(spendingBudgets)
      .where(
        and(
          eq(spendingBudgets.userId, profile.id),
          eq(spendingBudgets.isActive, true)
        )
      );

    if (budget?.dailyLimit && profile.fcmToken) {
      const limit = Number(budget.dailyLimit);
      const pct = (totalToday / limit) * 100;
      const threshold = budget.alertAtPercent ?? 80;
      if (pct >= threshold) {
        try {
          await sendFCMNotification({
            token: profile.fcmToken,
            title:
              pct >= 100
                ? "Budget exceeded"
                : `${Math.round(pct)}% of daily budget used`,
            body: `Spent ${Math.round(totalToday).toLocaleString()} / ${Math.round(limit).toLocaleString()} ${budget.currency}.`,
            data: { screen: "spending" },
          });
        } catch {
          /* optional */
        }
      }
    }

    return NextResponse.json({ success: true, totalToday });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
