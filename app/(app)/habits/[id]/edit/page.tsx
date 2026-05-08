import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { HabitEditor } from "@/components/HabitEditor";

export default async function EditHabitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-background pb-28 text-foreground">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-neutral-200 bg-white px-4 py-4">
        <Link
          href="/habits"
          className="flex size-10 items-center justify-center rounded-full text-neutral-600 transition hover:bg-neutral-100"
          aria-label="Back"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-lg font-bold tracking-tight">Edit habit</h1>
      </header>
      <HabitEditor habitId={id} />
    </div>
  );
}
