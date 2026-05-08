import { format, subDays } from "date-fns";
import { and, desc, eq } from "drizzle-orm";
import { requireDb } from "@/lib/db";
import { accountabilityEvents } from "@/lib/db/schema";

export const BIBLE_STEP_KEYS = [
  "bible_verse",
  "bible_audio",
  "bible_guided_scripture",
  "bible_guided_prayer",
] as const;

export type BibleStepKey = (typeof BIBLE_STEP_KEYS)[number];

export type BibleProgress = {
  date: string;
  completed: Record<BibleStepKey, boolean>;
  completedCount: number;
  isDayComplete: boolean;
  streakDays: number;
  diamonds: number;
  canUnfreeze: boolean;
  unfreezeTargetDate: string | null;
};

function toStepRecord(keys: string[]): Record<BibleStepKey, boolean> {
  return {
    bible_verse: keys.includes("bible_verse"),
    bible_audio: keys.includes("bible_audio"),
    bible_guided_scripture: keys.includes("bible_guided_scripture"),
    bible_guided_prayer: keys.includes("bible_guided_prayer"),
  };
}

export async function getBibleProgress(userId: string): Promise<BibleProgress> {
  const db = requireDb();
  const today = format(new Date(), "yyyy-MM-dd");
  const empty: BibleProgress = {
    date: today,
    completed: {
      bible_verse: false,
      bible_audio: false,
      bible_guided_scripture: false,
      bible_guided_prayer: false,
    },
    completedCount: 0,
    isDayComplete: false,
    streakDays: 0,
    diamonds: 0,
    canUnfreeze: false,
    unfreezeTargetDate: null,
  };
  try {
    const todayRows = await db
      .select({ type: accountabilityEvents.type })
      .from(accountabilityEvents)
      .where(
        and(eq(accountabilityEvents.userId, userId), eq(accountabilityEvents.logDate, today))
      )
      .orderBy(desc(accountabilityEvents.createdAt));

    const todayStepTypes = todayRows
      .map((r) => r.type)
      .filter((t): t is BibleStepKey => BIBLE_STEP_KEYS.includes(t as BibleStepKey));

    const completed = toStepRecord(todayStepTypes);
    const completedCount = Object.values(completed).filter(Boolean).length;
    const isDayComplete = completedCount === BIBLE_STEP_KEYS.length;

    const dayCompleteDates = new Set<string>();
    const repairedDates = new Set<string>();
    let rewardEvents = 0;
    let spendEvents = 0;
    const allRows = await db
      .select({
        type: accountabilityEvents.type,
        logDate: accountabilityEvents.logDate,
        description: accountabilityEvents.description,
      })
      .from(accountabilityEvents)
      .where(eq(accountabilityEvents.userId, userId));

    const byDay = new Map<string, Set<string>>();
    for (const row of allRows) {
      const d = format(row.logDate, "yyyy-MM-dd");
      if (!byDay.has(d)) byDay.set(d, new Set());
      byDay.get(d)!.add(row.type);
      if (row.type === "bible_unfreeze_use") {
        const descDate = /unfreeze:(\d{4}-\d{2}-\d{2})/.exec(row.description ?? "")?.[1];
        if (descDate) repairedDates.add(descDate);
        spendEvents += 1;
      }
      if (row.type === "bible_diamond_reward") rewardEvents += 1;
    }
    for (const [d, set] of byDay.entries()) {
      if (BIBLE_STEP_KEYS.every((k) => set.has(k))) dayCompleteDates.add(d);
    }
    for (const d of repairedDates) dayCompleteDates.add(d);

    let streakDays = 0;
    let cursor = new Date();
    let cursorKey = format(cursor, "yyyy-MM-dd");
    if (!dayCompleteDates.has(cursorKey)) {
      cursor = subDays(cursor, 1);
      cursorKey = format(cursor, "yyyy-MM-dd");
    }
    while (dayCompleteDates.has(cursorKey)) {
      streakDays += 1;
      cursor = subDays(cursor, 1);
      cursorKey = format(cursor, "yyyy-MM-dd");
    }

    const diamonds = Math.max(0, rewardEvents - spendEvents);
    const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
    const twoDaysAgo = format(subDays(new Date(), 2), "yyyy-MM-dd");
    const canUnfreeze =
      !isDayComplete &&
      !dayCompleteDates.has(yesterday) &&
      dayCompleteDates.has(twoDaysAgo) &&
      diamonds > 0;

    return {
      date: today,
      completed,
      completedCount,
      isDayComplete,
      streakDays,
      diamonds,
      canUnfreeze,
      unfreezeTargetDate: canUnfreeze ? yesterday : null,
    };
  } catch {
    return empty;
  }
}

export async function completeBibleStep(userId: string, step: BibleStepKey) {
  const db = requireDb();
  const today = format(new Date(), "yyyy-MM-dd");
  try {
    const [existing] = await db
      .select({ id: accountabilityEvents.id })
      .from(accountabilityEvents)
      .where(
        and(
          eq(accountabilityEvents.userId, userId),
          eq(accountabilityEvents.logDate, today),
          eq(accountabilityEvents.type, step)
        )
      )
      .limit(1);

    if (!existing) {
      await db.insert(accountabilityEvents).values({
        userId,
        type: step,
        description: `Completed ${step.replace("bible_", "").replaceAll("_", " ")}`,
        logDate: today,
      });
    }

    const todayRows = await db
      .select({ type: accountabilityEvents.type })
      .from(accountabilityEvents)
      .where(
        and(eq(accountabilityEvents.userId, userId), eq(accountabilityEvents.logDate, today))
      );
    const done = BIBLE_STEP_KEYS.every((k) => todayRows.some((r) => r.type === k));
    if (done) {
      const [rewardExists] = await db
        .select({ id: accountabilityEvents.id })
        .from(accountabilityEvents)
        .where(
          and(
            eq(accountabilityEvents.userId, userId),
            eq(accountabilityEvents.logDate, today),
            eq(accountabilityEvents.type, "bible_diamond_reward")
          )
        )
        .limit(1);
      if (!rewardExists) {
        await db.insert(accountabilityEvents).values({
          userId,
          type: "bible_diamond_reward",
          description: "Diamond reward for full Bible day",
          logDate: today,
        });
      }
    }
  } catch {
    // Ignore write failures for now; return computed fallback progress.
  }

  return getBibleProgress(userId);
}

export async function unfreezeBibleDay(userId: string) {
  const db = requireDb();
  const progress = await getBibleProgress(userId);
  if (!progress.canUnfreeze || !progress.unfreezeTargetDate) return progress;
  try {
    await db.insert(accountabilityEvents).values({
      userId,
      type: "bible_unfreeze_use",
      description: `unfreeze:${progress.unfreezeTargetDate}`,
      logDate: format(new Date(), "yyyy-MM-dd"),
    });
  } catch {
    // ignore
  }
  return getBibleProgress(userId);
}
