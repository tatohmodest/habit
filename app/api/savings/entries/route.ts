import { and, desc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireDb } from "@/lib/db";
import { savingsAccounts, savingsEntries } from "@/lib/db/schema";
import { accessCookieValue, SAVINGS_ACCESS_COOKIE } from "@/lib/savings/auth";
import { ensureSavingsSchema } from "@/lib/savings/ensure";
import { getProfileForApi } from "@/lib/session";

async function requireSavingsAccess() {
  const profile = await getProfileForApi();
  if (!profile) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const jar = await cookies();
  if (jar.get(SAVINGS_ACCESS_COOKIE)?.value !== accessCookieValue(profile.id)) {
    return { error: NextResponse.json({ error: "Savings locked" }, { status: 403 }) };
  }
  return { profile };
}

export async function GET() {
  try {
    await ensureSavingsSchema();
    const access = await requireSavingsAccess();
    if ("error" in access) return access.error;
    const db = requireDb();
    const [account] = await db
      .select({ id: savingsAccounts.id })
      .from(savingsAccounts)
      .where(eq(savingsAccounts.userId, access.profile.id))
      .limit(1);
    if (!account) return NextResponse.json({ error: "Savings account not found." }, { status: 404 });

    const entries = await db
      .select()
      .from(savingsEntries)
      .where(
        and(
          eq(savingsEntries.userId, access.profile.id),
          eq(savingsEntries.accountId, account.id)
        )
      )
      .orderBy(desc(savingsEntries.createdAt))
      .limit(100);

    const balance = entries.reduce((sum, e) => sum + Number(e.amount), 0);
    return NextResponse.json({ entries, balance });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureSavingsSchema();
    const access = await requireSavingsAccess();
    if ("error" in access) return access.error;
    const db = requireDb();
    const body = (await req.json()) as { type?: "add" | "subtract"; amount?: number; note?: string };
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    const [account] = await db
      .select({ id: savingsAccounts.id })
      .from(savingsAccounts)
      .where(eq(savingsAccounts.userId, access.profile.id))
      .limit(1);
    if (!account) return NextResponse.json({ error: "Savings account not found." }, { status: 404 });

    const existing = await db
      .select({ amount: savingsEntries.amount })
      .from(savingsEntries)
      .where(eq(savingsEntries.accountId, account.id));
    const balance = existing.reduce((sum, e) => sum + Number(e.amount), 0);

    const signedAmount = body.type === "subtract" ? -amount : amount;
    if (balance + signedAmount < 0) {
      return NextResponse.json({ error: "Insufficient savings balance." }, { status: 400 });
    }

    await db.insert(savingsEntries).values({
      userId: access.profile.id,
      accountId: account.id,
      amount: String(signedAmount),
      note: typeof body.note === "string" ? body.note.trim() || null : null,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

