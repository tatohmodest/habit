import { format, startOfISOWeek } from "date-fns";

const REFLECTION_PROMPTS = [
  "What one decision helped you stay consistent this week, and what one thing will you improve next week?",
  "Which moment this week made discipline easiest, and how can you recreate it tomorrow?",
  "What habit gave you the biggest return this week, and what distraction cost you the most?",
  "When did you almost quit this week, and what helped you keep going?",
  "What promise did you keep to yourself this week, and which promise needs more structure next week?",
  "What trigger most often led to missed habits, and what is your plan to block it?",
  "Which small win are you proud of this week, and how will you compound it next week?",
  "Where did your spending align with your values this week, and where did it drift?",
  "What time of day were you most faithful to your routines, and how will you protect that window?",
  "What will you stop doing next week so your key habits become easier to complete?",
  "What did you learn about yourself from this week’s streak pattern?",
  "If next week was 10% better, what specific action would make that true?",
];

function hashText(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function getWeeklyReflectionPrompt(userId: string, date = new Date()) {
  const weekKey = format(startOfISOWeek(date), "yyyy-MM-dd");
  const idx = hashText(`${userId}:${weekKey}`) % REFLECTION_PROMPTS.length;
  return REFLECTION_PROMPTS[idx];
}

