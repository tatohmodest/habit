import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
type DbBundle = {
  client: ReturnType<typeof postgres>;
  db: ReturnType<typeof drizzle<typeof schema>>;
};

declare global {
  // eslint-disable-next-line no-var
  var __habitDbBundle: DbBundle | undefined;
}

function createBundle(): DbBundle | null {
  if (!connectionString) return null;
  // Supabase pooler in session mode can hit max client caps quickly during dev.
  // Keep pool tiny and disable prepared statements for pooler compatibility.
  const client = postgres(connectionString, {
    max: 1,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  const db = drizzle(client, { schema });
  return { client, db };
}

const bundle =
  globalThis.__habitDbBundle ??
  (() => {
    const created = createBundle();
    if (!created) return null;
    globalThis.__habitDbBundle = created;
    return created;
  })();

export const db = bundle?.db ?? null;

export function requireDb() {
  if (!db) {
    throw new Error(
      "DATABASE_URL is not configured. Add it to .env.local to use the habit app."
    );
  }
  return db;
}
