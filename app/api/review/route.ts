import { endOfISOWeek, format, startOfISOWeek } from "date-fns";
import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireDb } from "@/lib/db";
import type { WeeklySummary } from "@/lib/db/schema";
import { weeklyReviews } from "@/lib/db/schema";
import { getProfileForApi } from "@/lib/session";

export async function GET() {
  try {
    const profile = await getProfileForApi();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const db = requireDb();

    const rows = await db
      .select()
      .from(weeklyReviews)
      .where(eq(weeklyReviews.userId, profile.id))
      .orderBy(desc(weeklyReviews.weekStart))
      .limit(12);

    const weekStart = format(
      startOfISOWeek(new Date()),
      "yyyy-MM-dd"
    );
    const weekEnd = format(
      endOfISOWeek(new Date()),
      "yyyy-MM-dd"
    );

    const current = rows.find((r) => r.weekStart === weekStart) ?? null;

    return NextResponse.json({
      weekStart,
      weekEnd,
      entries: rows,
      current,
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

    const reflection =
      typeof body.reflection === "string" ? body.reflection : "";
    const score =
      typeof body.score === "number"
        ? Math.min(100, Math.max(0, Math.round(body.score)))
        : null;

    const weekStart = format(
      startOfISOWeek(new Date()),
      "yyyy-MM-dd"
    );
    const weekEnd = format(
      endOfISOWeek(new Date()),
      "yyyy-MM-dd"
    );

    const summary = (body.summary ?? null) as WeeklySummary | null;

    const [existing] = await db
      .select()
      .from(weeklyReviews)
      .where(
        and(
          eq(weeklyReviews.userId, profile.id),
          eq(weeklyReviews.weekStart, weekStart)
        )
      );

    if (existing) {
      await db
        .update(weeklyReviews)
        .set({
          reflection,
          score: score ?? existing.score,
          summary: summary ?? existing.summary,
          updatedAt: new Date(),
        })
        .where(eq(weeklyReviews.id, existing.id));
    } else {
      await db.insert(weeklyReviews).values({
        userId: profile.id,
        weekStart,
        weekEnd,
        reflection,
        score,
        summary,
      });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
