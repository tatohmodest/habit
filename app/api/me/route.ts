import { NextResponse } from "next/server";
import { getProfileForApi } from "@/lib/session";

export async function GET() {
  try {
    const profile = await getProfileForApi();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({
      id: profile.id,
      displayName: profile.displayName,
      email: profile.email,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
