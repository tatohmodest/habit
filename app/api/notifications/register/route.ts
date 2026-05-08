import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireDb } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { getProfileForApi } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const profile = await getProfileForApi();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const db = requireDb();
    const body = await req.json();
    const token =
      typeof body.fcmToken === "string"
        ? body.fcmToken
        : typeof body.token === "string"
          ? body.token
          : null;

    if (!token) {
      return NextResponse.json({ error: "fcmToken required" }, { status: 400 });
    }

    await db
      .update(profiles)
      .set({ fcmToken: token, updatedAt: new Date() })
      .where(eq(profiles.id, profile.id));

    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
