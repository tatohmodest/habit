import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireDb } from "@/lib/db";
import { habits, streaks } from "@/lib/db/schema";
import { getProfileForApi } from "@/lib/session";

const CATEGORIES = ["spiritual", "financial", "behavioral", "discipline"] as const;
const TYPES = ["boolean", "threshold", "counter"] as const;
const FREQUENCIES = ["daily", "weekly"] as const;

export async function GET() {
  try {
    const profile = await getProfileForApi();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const db = requireDb();
    const rows = await db
      .select({
        habit: habits,
        streak: streaks,
      })
      .from(habits)
      .leftJoin(streaks, eq(streaks.habitId, habits.id))
      .where(eq(habits.userId, profile.id))
      .orderBy(asc(habits.sortOrder));

    return NextResponse.json({
      habits: rows.map((r) => ({
        ...r.habit,
        streak: r.streak,
      })),
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

    const body = (await req.json()) as Record<string, unknown>;
    const name =
      typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "name required" }, { status: 400 });
    }

    const categoryRaw =
      typeof body.category === "string" ? body.category : "discipline";
    if (!CATEGORIES.includes(categoryRaw as (typeof CATEGORIES)[number])) {
      return NextResponse.json({ error: "invalid category" }, { status: 400 });
    }
    const category = categoryRaw as (typeof CATEGORIES)[number];

    const typeRaw =
      typeof body.type === "string" ? body.type : "boolean";
    if (!TYPES.includes(typeRaw as (typeof TYPES)[number])) {
      return NextResponse.json({ error: "invalid type" }, { status: 400 });
    }
    const type = typeRaw as (typeof TYPES)[number];

    const frequencyRaw =
      typeof body.frequency === "string" ? body.frequency : "daily";
    if (!FREQUENCIES.includes(frequencyRaw as (typeof FREQUENCIES)[number])) {
      return NextResponse.json({ error: "invalid frequency" }, { status: 400 });
    }
    const frequency = frequencyRaw as (typeof FREQUENCIES)[number];

    const iconKey =
      typeof body.iconKey === "string" && body.iconKey.trim()
        ? body.iconKey.trim()
        : "CircleDot";
    const color =
      typeof body.color === "string" && body.color.trim()
        ? body.color.trim()
        : "#ec5b13";
    const description =
      typeof body.description === "string" ? body.description.trim() || null : null;

    let thresholdValue: string | null = null;
    let thresholdUnit: string | null = null;
    if (body.thresholdValue !== undefined) {
      const n =
        typeof body.thresholdValue === "number"
          ? body.thresholdValue
          : Number(body.thresholdValue);
      thresholdValue =
        body.thresholdValue === null || Number.isNaN(n) ? null : String(n);
    }
    if (typeof body.thresholdUnit === "string") {
      thresholdUnit = body.thresholdUnit || null;
    }

    let targetCount: number | null = null;
    if (body.targetCount !== undefined) {
      if (body.targetCount === null) targetCount = null;
      else if (typeof body.targetCount === "number" && !Number.isNaN(body.targetCount)) {
        targetCount = body.targetCount;
      }
    }

    const isPinned = typeof body.isPinned === "boolean" ? body.isPinned : false;

    const db = requireDb();
    const orderRows = await db
      .select({ sortOrder: habits.sortOrder })
      .from(habits)
      .where(eq(habits.userId, profile.id));
    const nextOrder =
      (orderRows.length
        ? Math.max(...orderRows.map((r) => r.sortOrder ?? 0))
        : -1) + 1;

    const [created] = await db
      .insert(habits)
      .values({
        userId: profile.id,
        name,
        description,
        iconKey,
        color,
        category,
        type,
        frequency,
        thresholdValue,
        thresholdUnit,
        targetCount,
        isPinned,
        sortOrder: nextOrder,
      })
      .returning();

    if (!created) {
      return NextResponse.json({ error: "create failed" }, { status: 500 });
    }

    await db.insert(streaks).values({
      habitId: created.id,
      userId: profile.id,
      currentStreak: 0,
      longestStreak: 0,
      totalCompletions: 0,
    });

    return NextResponse.json({ habit: created });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
