import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireDb } from "@/lib/db";
import { savingsAccounts } from "@/lib/db/schema";
import { accessCookieValue, SAVINGS_ACCESS_COOKIE } from "@/lib/savings/auth";
import { ensureSavingsSchema } from "@/lib/savings/ensure";
import { getProfileForApi } from "@/lib/session";

function hashPin(pin: string) {
  return createHash("sha256").update(pin).digest("hex");
}

function validPin(pin: string) {
  return /^[0-9]{4,6}$/.test(pin);
}

export async function GET() {
  try {
    await ensureSavingsSchema();
    const profile = await getProfileForApi();
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const db = requireDb();
    const [account] = await db
      .select({ id: savingsAccounts.id })
      .from(savingsAccounts)
      .where(eq(savingsAccounts.userId, profile.id))
      .limit(1);
    const jar = await cookies();
    const unlocked = jar.get(SAVINGS_ACCESS_COOKIE)?.value === accessCookieValue(profile.id);
    return NextResponse.json({ hasAccount: Boolean(account), unlocked });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureSavingsSchema();
    const profile = await getProfileForApi();
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const db = requireDb();
    const body = (await req.json()) as { action?: string; pin?: string; confirmPin?: string };

    let shouldSetAccessCookie = false;

    if (body.action === "setup") {
      const pin = body.pin ?? "";
      const confirmPin = body.confirmPin ?? "";
      if (!validPin(pin) || pin !== confirmPin) {
        return NextResponse.json(
          { error: "Use a 4-6 digit PIN and make sure both match." },
          { status: 400 }
        );
      }
      const [existing] = await db
        .select({ id: savingsAccounts.id })
        .from(savingsAccounts)
        .where(eq(savingsAccounts.userId, profile.id))
        .limit(1);
      if (existing) {
        return NextResponse.json({ error: "Savings account already exists." }, { status: 409 });
      }
      await db.insert(savingsAccounts).values({
        userId: profile.id,
        pinHash: hashPin(pin),
      });
    } else if (body.action === "unlock") {
      const pin = body.pin ?? "";
      if (!validPin(pin)) {
        return NextResponse.json({ error: "Invalid PIN format." }, { status: 400 });
      }
      const [account] = await db
        .select({ pinHash: savingsAccounts.pinHash })
        .from(savingsAccounts)
        .where(eq(savingsAccounts.userId, profile.id))
        .limit(1);
      if (!account) {
        return NextResponse.json({ error: "Savings account not found." }, { status: 404 });
      }
      if (account.pinHash !== hashPin(pin)) {
        return NextResponse.json({ error: "Wrong PIN." }, { status: 401 });
      }
      shouldSetAccessCookie = true;
    } else {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }
    if (shouldSetAccessCookie) {
      const res = NextResponse.json({ success: true });
      res.cookies.set(SAVINGS_ACCESS_COOKIE, accessCookieValue(profile.id), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 12,
        path: "/",
      });
      return res;
    }
    return NextResponse.json({ success: true, requiresUnlock: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(SAVINGS_ACCESS_COOKIE, "", { maxAge: 0, path: "/" });
  return res;
}

