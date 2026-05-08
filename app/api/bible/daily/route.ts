import { NextResponse } from "next/server";
import { getDailyBible } from "@/lib/youversion/daily";

export async function GET() {
  try {
    const payload = await getDailyBible();
    return NextResponse.json(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
