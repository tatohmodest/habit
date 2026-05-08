import { and, desc, eq } from "drizzle-orm";
import { PiggyBank } from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SavingsLockButton } from "@/components/SavingsLockButton";
import { SavingsLedger } from "@/components/SavingsLedger";
import { requireDb } from "@/lib/db";
import { savingsAccounts, savingsEntries, spendingBudgets } from "@/lib/db/schema";
import { accessCookieValue, SAVINGS_ACCESS_COOKIE } from "@/lib/savings/auth";
import { ensureSavingsSchema } from "@/lib/savings/ensure";
import { requireProfile } from "@/lib/session";

export default async function SavingsPage() {
  await ensureSavingsSchema();
  const profile = await requireProfile();
  const jar = await cookies();
  if (jar.get(SAVINGS_ACCESS_COOKIE)?.value !== accessCookieValue(profile.id)) {
    redirect("/spending/savings/access");
  }

  const db = requireDb();
  const [account] = await db
    .select({ id: savingsAccounts.id })
    .from(savingsAccounts)
    .where(eq(savingsAccounts.userId, profile.id))
    .limit(1);
  if (!account) redirect("/spending/savings/access");

  const entries = await db
    .select({
      id: savingsEntries.id,
      amount: savingsEntries.amount,
      note: savingsEntries.note,
      createdAt: savingsEntries.createdAt,
    })
    .from(savingsEntries)
    .where(
      and(eq(savingsEntries.userId, profile.id), eq(savingsEntries.accountId, account.id))
    )
    .orderBy(desc(savingsEntries.createdAt))
    .limit(100);
  const balance = entries.reduce((sum, e) => sum + Number(e.amount), 0);
  const serializedEntries = entries.map((e) => ({
    ...e,
    createdAt: new Date(e.createdAt).toISOString(),
  }));

  const [budget] = await db
    .select({ currency: spendingBudgets.currency })
    .from(spendingBudgets)
    .where(and(eq(spendingBudgets.userId, profile.id), eq(spendingBudgets.isActive, true)))
    .limit(1);
  const currency = budget?.currency ?? "XAF";

  return (
    <div className="min-h-screen bg-background pb-24 text-foreground">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white p-4">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between">
          <div>
            <h1 className="inline-flex items-center gap-2 text-lg font-black text-neutral-900">
              <PiggyBank className="size-5 text-primary" />
              Savings vault
            </h1>
            <p className="text-xs text-neutral-500">Private and PIN protected</p>
          </div>
          <SavingsLockButton />
        </div>
      </header>

      <SavingsLedger
        initialEntries={serializedEntries}
        initialBalance={balance}
        currency={currency}
      />
    </div>
  );
}

