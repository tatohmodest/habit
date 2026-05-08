import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { requireDb } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function ensureProfileRow(user: User) {
  const db = requireDb();
  let row: typeof profiles.$inferSelect | null = null;
  try {
    [row] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, user.id));
  } catch {
    // Fallback for environments where profiles table/query is temporarily unavailable.
    const email = user.email ?? "";
    const display =
      (typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : null) ??
      email.split("@")[0] ??
      "User";
    return {
      id: user.id,
      email,
      displayName: display,
      fcmToken: null,
      timezone: "Africa/Douala",
      avatarUrl: null,
      onboarded: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies typeof profiles.$inferSelect;
  }

  if (!row) {
    const email = user.email ?? "";
    const display =
      (typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : null) ??
      email.split("@")[0] ??
      "User";

    try {
      await db
        .insert(profiles)
        .values({
          id: user.id,
          email,
          displayName: display,
        })
        .onConflictDoUpdate({
          target: profiles.id,
          set: {
            email,
            displayName: display,
            updatedAt: new Date(),
          },
        });

      [row] = await db.select().from(profiles).where(eq(profiles.id, user.id));
    } catch {
      // Same fallback path if insert/select fails.
      return {
        id: user.id,
        email,
        displayName: display,
        fcmToken: null,
        timezone: "Africa/Douala",
        avatarUrl: null,
        onboarded: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } satisfies typeof profiles.$inferSelect;
    }
  }

  return row ?? null;
}

/** Server Components: redirect to login if anonymous */
export async function requireProfile() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const row = await ensureProfileRow(user);
  if (!row) {
    redirect("/login?error=profile");
  }

  return row;
}

/** Route handlers: return null instead of redirect */
export async function getProfileForApi() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  return ensureProfileRow(user);
}

/** @deprecated use requireProfile or getProfileForApi */
export async function getSessionUser() {
  return requireProfile();
}
