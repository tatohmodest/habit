import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireDb } from "@/lib/db";
import { spendingBudgets } from "@/lib/db/schema";
import { getProfileForApi } from "@/lib/session";

export async function GET() {
  try {
    const profile = await getProfileForApi();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const db = requireDb();
    const [budget] = await db
      .select()
      .from(spendingBudgets)
      .where(
        and(
          eq(spendingBudgets.userId, profile.id),
          eq(spendingBudgets.isActive, true)
        )
      );

    return NextResponse.json({
      budget: budget ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function PATCH(req: Request) {
  try {
    const profile = await getProfileForApi();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const db = requireDb();
    const body = await req.json();

    const dailyLimit =
      typeof body.dailyLimit === "number"
        ? body.dailyLimit
        : typeof body.dailyLimit === "string"
          ? Number(body.dailyLimit)
          : undefined;
    const alertAtPercent =
      typeof body.alertAtPercent === "number"
        ? body.alertAtPercent
        : undefined;

    const [existing] = await db
      .select()
      .from(spendingBudgets)
      .where(
        and(
          eq(spendingBudgets.userId, profile.id),
          eq(spendingBudgets.isActive, true)
        )
      );

    if (existing) {
      await db
        .update(spendingBudgets)
        .set({
          ...(dailyLimit !== undefined && !Number.isNaN(dailyLimit)
            ? { dailyLimit: String(dailyLimit) }
            : {}),
          ...(alertAtPercent !== undefined ? { alertAtPercent } : {}),
          updatedAt: new Date(),
        })
        .where(eq(spendingBudgets.id, existing.id));
    } else {
      await db.insert(spendingBudgets).values({
        userId: profile.id,
        dailyLimit:
          dailyLimit !== undefined && !Number.isNaN(dailyLimit)
            ? String(dailyLimit)
            : "10000",
        alertAtPercent: alertAtPercent ?? 80,
        currency: "XAF",
        isActive: true,
      });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
