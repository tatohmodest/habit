import { getDayOfYear } from "date-fns";
import { fetchPassage, fetchVerseOfTheDayPassageId } from "@/lib/youversion/client";

/** Curated passage IDs (YouVersion platform format) rotated by day of year. */
const ROTATING_PASSAGES: { id: string; shortLabel: string }[] = [
  { id: "JHN.3.16", shortLabel: "John 3:16" },
  { id: "PSA.23.1-6", shortLabel: "Psalm 23" },
  { id: "PHP.4.6-7", shortLabel: "Philippians 4:6–7" },
  { id: "ROM.8.28", shortLabel: "Romans 8:28" },
  { id: "ISA.41.10", shortLabel: "Isaiah 41:10" },
  { id: "MAT.11.28-30", shortLabel: "Matthew 11:28–30" },
  { id: "JER.29.11", shortLabel: "Jeremiah 29:11" },
  { id: "PRO.3.5-6", shortLabel: "Proverbs 3:5–6" },
  { id: "2TI.1.7", shortLabel: "2 Timothy 1:7" },
  { id: "JOS.1.9", shortLabel: "Joshua 1:9" },
  { id: "ROM.12.2", shortLabel: "Romans 12:2" },
  { id: "GAL.5.22-23", shortLabel: "Galatians 5:22–23" },
];

const DEVOTION_SNIPPETS: string[] = [
  "Carry one verse through the day: let it shape what you notice and how you respond.",
  "Small consistency beats intensity. Show up again today — that is the streak.",
  "Name what you are grateful for before you scroll. Gratitude steadies attention.",
  "When pressure rises, return to breath and truth — pause, pray, proceed.",
  "Your habits are votes for the person you are becoming. Vote once today.",
  "Mercy is fresh each morning. You are not defined by yesterday’s slip.",
  "Discipline is love with direction. Do the next right thing, quietly.",
  "Peace is often a practice, not a feeling. Return to the verse when the mind races.",
  "Walk faithfully in the ordinary hours — that is where character is forged.",
  "Ask for wisdom, then take one concrete step. Faith loves specifics.",
  "Remember who walks with you. Courage is not the absence of fear.",
  "Keep the main thing the main thing. One focused yes beats ten distracted maybes.",
];

export type DailyBiblePayload = {
  day: number;
  passageId: string;
  reference: string;
  content: string;
  bibleId: number;
  deepLink: string | null;
  devotion: string;
  configured: boolean;
  source: "youversion_official" | "fallback_curated";
  error?: string;
};

export async function getDailyBible(): Promise<DailyBiblePayload> {
  const bibleId = Number(process.env.YOUVERSION_BIBLE_ID ?? "3034");
  const day = getDayOfYear(new Date());
  const passage = ROTATING_PASSAGES[(day - 1) % ROTATING_PASSAGES.length];
  const devotion =
    DEVOTION_SNIPPETS[(day - 1) % DEVOTION_SNIPPETS.length] ?? DEVOTION_SNIPPETS[0];

  if (!process.env.YOUVERSION_APP_KEY) {
    return {
      day,
      passageId: passage.id,
      reference: passage.shortLabel,
      content: "",
      bibleId,
      deepLink: null,
      devotion,
      configured: false,
      source: "fallback_curated",
    };
  }

  try {
    let selectedPassageId = passage.id;
    try {
      selectedPassageId = await fetchVerseOfTheDayPassageId(day);
    } catch {
      // If official VOTD endpoint is unavailable for this key/scope, fallback.
      selectedPassageId = passage.id;
    }
    const passageResult = await fetchPassage(bibleId, selectedPassageId);
    return {
      day,
      passageId: passageResult.passageId,
      reference: passageResult.reference || passage.shortLabel,
      content: passageResult.content,
      bibleId: passageResult.bibleId,
      deepLink: passageResult.deepLink,
      devotion,
      configured: true,
      source:
        selectedPassageId === passage.id ? "fallback_curated" : "youversion_official",
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return {
      day,
      passageId: passage.id,
      reference: passage.shortLabel,
      content: "",
      bibleId,
      deepLink: null,
      devotion,
      configured: true,
      source: "fallback_curated",
      error: message,
    };
  }
}
