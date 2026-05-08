"use client";

import { CheckCircle2, Diamond, Flame, Snowflake, Volume2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { CompletionCelebrationModal } from "@/components/CompletionCelebrationModal";
import type { DailyBiblePayload } from "@/lib/youversion/daily";
import type { BibleProgress, BibleStepKey } from "@/lib/bible/streak";

type Step = {
  key: BibleStepKey;
  title: string;
  description: string;
};

const STEPS: Step[] = [
  {
    key: "bible_verse",
    title: "Verse of the day",
    description: "Read today's verse and lock your first step.",
  },
  {
    key: "bible_audio",
    title: "Audio Bible",
    description: "Listen to today's verse audio to anchor it in your mind.",
  },
  {
    key: "bible_guided_scripture",
    title: "Guided scripture",
    description: "Walk through the guided scripture reflection.",
  },
  {
    key: "bible_guided_prayer",
    title: "Guided prayer",
    description: "Close with a guided prayer to seal the day.",
  },
];

export function BibleStreakCard({
  bible,
  initialProgress,
}: {
  bible: DailyBiblePayload;
  initialProgress: BibleProgress;
}) {
  const [progress, setProgress] = useState(initialProgress);
  const [loadingStep, setLoadingStep] = useState<string | null>(null);
  const [openStep, setOpenStep] = useState<BibleStepKey | null>("bible_verse");
  const [celebrate, setCelebrate] = useState<{ open: boolean; title: string; subtitle: string }>(
    { open: false, title: "", subtitle: "" }
  );

  const closeCelebrate = useCallback(
    () => setCelebrate({ open: false, title: "", subtitle: "" }),
    []
  );

  async function completeStep(step: BibleStepKey) {
    if (progress.completed[step] || loadingStep) return;
    setLoadingStep(step);
    try {
      const res = await fetch("/api/bible/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = (await res.json()) as BibleProgress;
      setProgress(data);
      setCelebrate({
        open: true,
        title: "Great job!",
        subtitle:
          step === "bible_audio"
            ? "Audio Bible step completed."
            : "Bible step completed.",
      });
    } finally {
      setLoadingStep(null);
    }
  }

  async function playAudioStep() {
    const text = `${bible.reference}. ${bible.content || bible.devotion}`;
    if (typeof window !== "undefined" && "speechSynthesis" in window && text.trim()) {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.95;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    }
    await completeStep("bible_audio");
  }

  async function unfreezeDay() {
    const res = await fetch("/api/bible/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unfreeze" }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as BibleProgress;
    setProgress(data);
    setCelebrate({
      open: true,
      title: "Streak recovered",
      subtitle: "A diamond was used to unfreeze your missed day.",
    });
  }

  return (
    <section className="mx-4 mb-6 overflow-hidden rounded-2xl border border-neutral-200 bg-gradient-to-br from-white via-white to-orange-50 shadow-sm">
      <div className="relative p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              Bible streak
            </p>
            <p className="mt-1 text-lg font-bold leading-snug text-neutral-900">
              {bible.reference}
            </p>
            <p className="mt-1 text-[11px] font-medium text-neutral-500">
              {bible.source === "youversion_official"
                ? "Official YouVersion Verse of the Day"
                : "Fallback daily passage (official VOTD unavailable for this key scope)"}
            </p>
          </div>
          <div className="rounded-full bg-primary/10 px-3 py-1 text-primary">
            <span className="inline-flex items-center gap-1 text-sm font-bold">
              <Flame className="size-4" />
              Day {Math.max(1, progress.streakDays)}
            </span>
          </div>
        </div>
        <div className="mb-3 inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
          <Diamond className="size-3.5" />
          {progress.diamonds} diamonds
        </div>

        {bible.content ? (
          <p className="mt-2 text-sm leading-relaxed text-neutral-800">{bible.content}</p>
        ) : null}
        <p className="mt-4 border-l-2 border-primary/40 pl-3 text-sm italic leading-relaxed text-neutral-700">
          {bible.devotion}
        </p>

        <div className="mt-5 space-y-2">
          {STEPS.map((step) => {
            const done = progress.completed[step.key];
            const busy = loadingStep === step.key;
            const onClick = () => setOpenStep((prev) => (prev === step.key ? null : step.key));

            return (
              <div
                key={step.key}
                className={`rounded-xl border p-3 transition ${
                  done
                    ? "border-green-300 bg-green-50"
                    : "border-neutral-200 bg-white hover:border-primary/40"
                } ${busy ? "opacity-60" : ""}`}
              >
                <button
                  type="button"
                  onClick={onClick}
                  className="flex w-full items-start gap-3 text-left"
                >
                  <span
                    className={`mt-0.5 inline-flex size-5 items-center justify-center rounded-full ${
                      done ? "bg-green-600 text-white" : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    {step.key === "bible_audio" && !done ? (
                      <Volume2 className="size-3.5" />
                    ) : (
                      <CheckCircle2 className="size-3.5" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-neutral-900">
                      {step.title}
                    </span>
                    <span className="block text-xs text-neutral-600">{step.description}</span>
                  </span>
                </button>
                {openStep === step.key && (
                  <div className="mt-3 space-y-2 rounded-lg bg-neutral-50 p-3">
                    {step.key === "bible_verse" && (
                      <p className="text-sm text-neutral-700">
                        <strong>{bible.reference}.</strong> {bible.content || bible.devotion}
                      </p>
                    )}
                    {step.key === "bible_guided_scripture" && (
                      <p className="text-sm text-neutral-700">
                        Guided scripture: Read the verse again slowly. What word stands out? What
                        is God inviting you to obey today? Write one concrete action before you
                        leave this screen.
                      </p>
                    )}
                    {step.key === "bible_guided_prayer" && (
                      <p className="text-sm text-neutral-700">
                        Guided prayer: “Lord, anchor me in Your Word today. Give me strength to act
                        on what You showed me and keep me faithful in small steps. Amen.”
                      </p>
                    )}
                    {step.key === "bible_audio" && (
                      <p className="text-sm text-neutral-700">
                        Audio playback uses your device voice right now. Tap play to listen and mark
                        this step.
                      </p>
                    )}
                    <div className="flex gap-2">
                      {step.key === "bible_audio" ? (
                        <button
                          type="button"
                          onClick={playAudioStep}
                          disabled={done || !!loadingStep}
                          className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                        >
                          Play audio + complete
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => completeStep(step.key)}
                          disabled={done || !!loadingStep}
                          className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                        >
                          Mark step complete
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {progress.isDayComplete && (
          <div className="mt-4 rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 via-white to-orange-50 p-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary text-white shadow-sm">
                <Flame className="size-4" />
              </span>
              <div>
                <p className="text-sm font-extrabold text-neutral-900">
                  Day {progress.streakDays} locked in
                </p>
                <p className="text-xs text-neutral-600">
                  You finished today. Keep the streak alive with your next check-in tomorrow.
                </p>
              </div>
            </div>
          </div>
        )}

        {progress.canUnfreeze && (
          <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <p className="inline-flex items-center gap-2 text-sm font-extrabold text-blue-900">
              <Snowflake className="size-4" />
              Missed day frozen
            </p>
            <p className="mt-1 text-xs text-blue-800">
              Use 1 diamond to unfreeze {progress.unfreezeTargetDate} and keep your streak alive.
            </p>
            <button
              type="button"
              onClick={unfreezeDay}
              className="mt-3 rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white"
            >
              Unfreeze with 1 diamond
            </button>
          </div>
        )}

        {bible.deepLink && (
          <Link
            href={bible.deepLink}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            Open in Bible App
          </Link>
        )}
      </div>
      <CompletionCelebrationModal
        open={celebrate.open}
        title={celebrate.title}
        subtitle={celebrate.subtitle}
        onClose={closeCelebrate}
      />
    </section>
  );
}
