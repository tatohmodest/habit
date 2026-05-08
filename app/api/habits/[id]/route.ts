import { and, eq, type InferInsertModel } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireDb } from "@/lib/db";
import { habits, streaks } from "@/lib/db/schema";
import { getProfileForApi } from "@/lib/session";

const CATEGORIES = ["spiritual", "financial", "behavioral", "discipline"] as const;
const TYPES = ["boolean", "threshold", "counter"] as const;
const FREQUENCIES = ["daily", "weekly"] as const;

type HabitInsert = InferInsertModel<typeof habits>;

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const profile = await getProfileForApi();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const db = requireDb();
    const [row] = await db
      .select({
        habit: habits,
        streak: streaks,
      })
      .from(habits)
      .leftJoin(streaks, eq(streaks.habitId, habits.id))
      .where(and(eq(habits.id, id), eq(habits.userId, profile.id)));

    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      habit: row.habit,
      streak: row.streak,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function PATCH(
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
    const [existing] = await db
      .select()
      .from(habits)
      .where(and(eq(habits.id, id), eq(habits.userId, profile.id)));

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = (await req.json()) as Record<string, unknown>;

    const patch: Partial<HabitInsert> = {};

    if (typeof body.name === "string" && body.name.trim()) {
      patch.name = body.name.trim();
    }
    if (typeof body.description === "string") {
      patch.description = body.description.trim() || null;
    }
    if (typeof body.iconKey === "string" && body.iconKey.trim()) {
      patch.iconKey = body.iconKey.trim();
    }
    if (typeof body.color === "string" && body.color.trim()) {
      patch.color = body.color.trim();
    }
    if (
      typeof body.category === "string" &&
      CATEGORIES.includes(body.category as (typeof CATEGORIES)[number])
    ) {
      patch.category = body.category as (typeof CATEGORIES)[number];
    }
    if (
      typeof body.type === "string" &&
      TYPES.includes(body.type as (typeof TYPES)[number])
    ) {
      patch.type = body.type as (typeof TYPES)[number];
    }
    if (
      typeof body.frequency === "string" &&
      FREQUENCIES.includes(body.frequency as (typeof FREQUENCIES)[number])
    ) {
      patch.frequency = body.frequency as (typeof FREQUENCIES)[number];
    }
    if (body.thresholdValue !== undefined) {
      const n =
        typeof body.thresholdValue === "number"
          ? body.thresholdValue
          : Number(body.thresholdValue);
      patch.thresholdValue =
        body.thresholdValue === null || Number.isNaN(n) ? null : String(n);
    }
    if (typeof body.thresholdUnit === "string" || body.thresholdUnit === null) {
      patch.thresholdUnit =
        body.thresholdUnit === null ? null : String(body.thresholdUnit);
    }
    if (body.targetCount !== undefined) {
      const tc = body.targetCount;
      if (tc === null) patch.targetCount = null;
      else if (typeof tc === "number" && !Number.isNaN(tc)) patch.targetCount = tc;
    }
    if (typeof body.isActive === "boolean") {
      patch.isActive = body.isActive;
    }
    if (typeof body.isPinned === "boolean") {
      patch.isPinned = body.isPinned;
    }

    patch.updatedAt = new Date();

    const [updated] = await db
      .update(habits)
      .set(patch)
      .where(eq(habits.id, id))
      .returning();

    return NextResponse.json({ habit: updated });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const profile = await getProfileForApi();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const db = requireDb();
    const deleted = await db
      .delete(habits)
      .where(and(eq(habits.id, id), eq(habits.userId, profile.id)))
      .returning({ id: habits.id });

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
