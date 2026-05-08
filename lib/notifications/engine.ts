import { format } from "date-fns";
import { and, eq } from "drizzle-orm";
import { requireDb } from "@/lib/db";
import {
  habits,
  habitLogs,
  notificationConfigs,
  notificationLogs,
  streaks,
  profiles,
} from "@/lib/db/schema";
import { sendFCMNotification } from "@/lib/notifications/fcm";

function timeToMinutes(time: string): number {
  const part = time.slice(0, 5);
  const [h, m] = part.split(":").map(Number);
  return h * 60 + m;
}

export async function runAlertEngine(userId: string) {
  const db = requireDb();
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const currentTime = format(now, "HH:mm");

  const [user] = await db.select().from(profiles).where(eq(profiles.id, userId));
  if (!user?.fcmToken) return;

  const activeHabits = await db
    .select()
    .from(habits)
    .where(and(eq(habits.userId, userId), eq(habits.isActive, true)));

  const ncRows = await db
    .select()
    .from(notificationConfigs)
    .where(eq(notificationConfigs.userId, userId));

  const ncByHabit = new Map(ncRows.map((r) => [r.habitId, r]));

  const todayLogs = await db
    .select()
    .from(habitLogs)
    .where(and(eq(habitLogs.userId, userId), eq(habitLogs.logDate, today)));

  const completedHabitIds = new Set(
    todayLogs
      .filter((l) => l.status === "completed")
      .map((l) => l.habitId)
  );

  const pendingHabits = activeHabits.filter((h) => {
    if (h.frequency !== "daily") return false;
    return !completedHabitIds.has(h.id);
  });

  const sentAlerts = await db
    .select()
    .from(notificationLogs)
    .where(and(eq(notificationLogs.userId, userId), eq(notificationLogs.logDate, today)));

  const sentMap = new Map<string, Set<string>>();
  for (const log of sentAlerts) {
    if (!log.habitId) continue;
    if (!sentMap.has(log.habitId)) sentMap.set(log.habitId, new Set());
    sentMap.get(log.habitId)!.add(log.level);
  }

  for (const habit of pendingHabits) {
    const config = ncByHabit.get(habit.id);
    if (!config?.isEnabled) continue;

    const windowEnd =
      typeof habit.windowEnd === "string"
        ? habit.windowEnd
        : format(habit.windowEnd as unknown as Date, "HH:mm:ss");
    const windowEndMinutes = timeToMinutes(windowEnd);
    const currentMinutes = timeToMinutes(currentTime);
    let minutesLeft = windowEndMinutes - currentMinutes;
    if (minutesLeft < 0) minutesLeft += 24 * 60;

    const [streakRow] = await db
      .select()
      .from(streaks)
      .where(eq(streaks.habitId, habit.id));
    const streak = streakRow?.currentStreak ?? 0;

    const alreadySent = sentMap.get(habit.id) ?? new Set();

    const firstAlert =
      typeof config.firstAlertTime === "string"
        ? config.firstAlertTime
        : "08:00:00";
    const firstTime = firstAlert.slice(0, 5);

    if (currentTime >= firstTime && !alreadySent.has("gentle")) {
      await fireAlert({
        userId,
        habitId: habit.id,
        token: user.fcmToken,
        level: "gentle",
        title: habit.name,
        body:
          streak > 0
            ? `${streak}-day streak. Don't let it slip.`
            : `Start your streak today.`,
        logDate: today,
        badge: pendingHabits.length,
      });
      alreadySent.add("gentle");
    }

    const moderateThreshold = (config.moderateAlertHours ?? 4) * 60;
    const urgentMins = config.urgentAlertMinutes ?? 60;
    const criticalMins = config.criticalAlertMinutes ?? 30;

    if (
      minutesLeft <= moderateThreshold &&
      minutesLeft > urgentMins &&
      !alreadySent.has("moderate")
    ) {
      await fireAlert({
        userId,
        habitId: habit.id,
        token: user.fcmToken,
        level: "moderate",
        title: `${habit.name} — still pending`,
        body: `${Math.round(minutesLeft / 60)} hours left in your window.`,
        logDate: today,
        badge: pendingHabits.length,
      });
      alreadySent.add("moderate");
    }

    if (
      minutesLeft <= urgentMins &&
      minutesLeft > criticalMins &&
      !alreadySent.has("urgent")
    ) {
      await fireAlert({
        userId,
        habitId: habit.id,
        token: user.fcmToken,
        level: "urgent",
        title: `⚠️ ${streak} day streak at risk — ${habit.name}`,
        body: `${minutesLeft} minutes left.`,
        logDate: today,
        badge: pendingHabits.length,
      });
      alreadySent.add("urgent");
    }

    if (
      minutesLeft <= criticalMins &&
      minutesLeft > 0 &&
      !alreadySent.has("critical")
    ) {
      await fireAlert({
        userId,
        habitId: habit.id,
        token: user.fcmToken,
        level: "critical",
        title: `🔥 STREAK DIES IN ${minutesLeft} MIN — ${habit.name}`,
        body:
          streak > 7
            ? `${streak} days on the line. Open the app now.`
            : `Open the app. Check it off.`,
        logDate: today,
        badge: pendingHabits.length,
      });
      alreadySent.add("critical");
    }
  }
}

async function fireAlert(params: {
  userId: string;
  habitId: string;
  token: string;
  level: "gentle" | "moderate" | "urgent" | "critical";
  title: string;
  body: string;
  logDate: string;
  badge: number;
}) {
  try {
    await sendFCMNotification({
      token: params.token,
      title: params.title,
      body: params.body,
      badge: params.badge,
      data: {
        habitId: params.habitId,
        level: params.level,
        screen: "habits",
      },
    });
  } catch (e) {
    console.error("[FCM] send failed", e);
  }

  const db = requireDb();
  await db
    .insert(notificationLogs)
    .values({
      userId: params.userId,
      habitId: params.habitId,
      level: params.level,
      title: params.title,
      body: params.body,
      logDate: params.logDate,
    })
    .onConflictDoNothing({
      target: [
        notificationLogs.habitId,
        notificationLogs.logDate,
        notificationLogs.level,
      ],
    });
}
