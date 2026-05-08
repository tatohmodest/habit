"use client";

import { Check, CheckCheck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { CompletionCelebrationModal } from "@/components/CompletionCelebrationModal";

type Props = {
  habitId: string;
  disabled?: boolean;
  completed?: boolean;
};

export function CompleteHabitButton({
  habitId,
  disabled,
  completed,
}: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [showCelebrate, setShowCelebrate] = useState(false);

  const closeCelebrate = useCallback(() => setShowCelebrate(false), []);

  async function onToggle() {
    if (completed || disabled || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/habits/${habitId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(await res.text());
      setShowCelebrate(true);
      await queryClient.invalidateQueries({ queryKey: ["logs", "today"] });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled || loading || completed}
        onClick={onToggle}
        className={`flex size-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          completed
            ? "border-accent-green bg-accent-green text-white green-glow"
            : "border-neutral-200 bg-white text-neutral-700 hover:border-primary hover:text-primary"
        }`}
        aria-label={completed ? "Completed" : "Mark complete"}
      >
        {completed ? (
          <CheckCheck className="size-5" aria-hidden />
        ) : (
          <Check className="size-5" aria-hidden />
        )}
      </button>
      <CompletionCelebrationModal
        open={showCelebrate}
        title="Nice!"
        subtitle="Habit completed for today."
        onClose={closeCelebrate}
      />
    </>
  );
}
