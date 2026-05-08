import { NextResponse } from "next/server";
import { requireDb } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { runAlertEngine } from "@/lib/notifications/engine";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const db = requireDb();
    const allProfiles = await db.select({ id: profiles.id }).from(profiles);
    await Promise.all(allProfiles.map((u) => runAlertEngine(u.id)));
    return NextResponse.json({ ok: true, processed: allProfiles.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
