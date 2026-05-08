import { Plus } from "lucide-react";
import Link from "next/link";
import { HabitsCategoryTabs } from "@/components/HabitsCategoryTabs";
import { loadTodaySnapshot } from "@/lib/data/today";
import { requireProfile } from "@/lib/session";

export default async function HabitsPage() {
  const profile = await requireProfile();
  const snapshot = await loadTodaySnapshot(profile.id);

  return (
    <div className="min-h-screen bg-background pb-28 text-foreground">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white p-4">
        <h1 className="text-xl font-bold tracking-tight">My habits</h1>
        <Link
          href="/habits/new"
          className="flex size-10 items-center justify-center rounded-full bg-primary text-white shadow-md shadow-primary/25 transition active:scale-95"
          aria-label="New habit"
        >
          <Plus className="size-5" aria-hidden />
        </Link>
      </header>

      <HabitsCategoryTabs habits={snapshot.habits} />
    </div>
  );
}
