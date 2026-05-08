import { sql } from "drizzle-orm";
import { requireDb } from "@/lib/db";

declare global {
  // eslint-disable-next-line no-var
  var __savingsSchemaReady: Promise<void> | undefined;
}

async function runEnsure() {
  const db = requireDb();
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS savings_accounts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
      pin_hash text NOT NULL,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    );
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS savings_entries (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      account_id uuid NOT NULL REFERENCES savings_accounts(id) ON DELETE CASCADE,
      amount numeric(12,2) NOT NULL,
      note text,
      created_at timestamp NOT NULL DEFAULT now()
    );
  `);
}

export async function ensureSavingsSchema() {
  globalThis.__savingsSchemaReady ??= runEnsure();
  await globalThis.__savingsSchemaReady;
}

