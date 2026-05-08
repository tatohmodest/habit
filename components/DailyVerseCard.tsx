import { getBibleProgress } from "@/lib/bible/streak";
import { BibleStreakCard } from "@/components/BibleStreakCard";
import { getDailyBible } from "@/lib/youversion/daily";
import { requireProfile } from "@/lib/session";

export async function DailyVerseCard() {
  const profile = await requireProfile();
  const bible = await getDailyBible();
  const progress = await getBibleProgress(profile.id);
  return <BibleStreakCard bible={bible} initialProgress={progress} />;
}
