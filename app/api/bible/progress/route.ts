import { NextResponse } from "next/server";
import {
  BIBLE_STEP_KEYS,
  completeBibleStep,
  type BibleStepKey,
  getBibleProgress,
  unfreezeBibleDay,
} from "@/lib/bible/streak";
import { getProfileForApi } from "@/lib/session";

export async function GET() {
  try {
    const profile = await getProfileForApi();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const progress = await getBibleProgress(profile.id);
    return NextResponse.json(progress);
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

    const body = (await req.json()) as { step?: string; action?: string };
    if (body.action === "unfreeze") {
      const progress = await unfreezeBibleDay(profile.id);
      return NextResponse.json(progress);
    }
    if (typeof body.step !== "string" || !BIBLE_STEP_KEYS.includes(body.step as BibleStepKey)) {
      return NextResponse.json({ error: "Invalid step" }, { status: 400 });
    }

    const progress = await completeBibleStep(profile.id, body.step as BibleStepKey);
    return NextResponse.json(progress);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
