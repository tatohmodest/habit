import { eq } from "drizzle-orm";
import { requireDb } from "@/lib/db";
import { savingsAccounts } from "@/lib/db/schema";
import { ensureSavingsSchema } from "@/lib/savings/ensure";
import { requireProfile } from "@/lib/session";
import { SavingsAccessScreen } from "@/components/SavingsAccessScreen";

export default async function SavingsAccessPage() {
  await ensureSavingsSchema();
  const profile = await requireProfile();
  const db = requireDb();
  const [account] = await db
    .select({ id: savingsAccounts.id })
    .from(savingsAccounts)
    .where(eq(savingsAccounts.userId, profile.id))
    .limit(1);

  return <SavingsAccessScreen hasAccount={Boolean(account)} />;
}

