"use client";

import { CheckCircle2, Flame } from "lucide-react";
import { useEffect } from "react";

function playCelebrateTone() {
  if (typeof window === "undefined") return;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const now = ctx.currentTime;

  const notes = [523.25, 659.25, 783.99, 987.77];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + i * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.16, now + i * 0.08 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.1 + 0.32);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + i * 0.1);
    osc.stop(now + i * 0.1 + 0.34);
  });
  setTimeout(() => void ctx.close(), 1600);
}

export function CompletionCelebrationModal({
  open,
  title,
  subtitle,
  onClose,
}: {
  open: boolean;
  title: string;
  subtitle: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    playCelebrateTone();
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 px-6">
      <div className="celebrate-pop relative w-full max-w-sm overflow-hidden rounded-3xl bg-white p-8 text-center shadow-2xl">
        <div className="pointer-events-none absolute inset-0">
          <span className="confetti confetti-1" />
          <span className="confetti confetti-2" />
          <span className="confetti confetti-3" />
          <span className="confetti confetti-4" />
          <span className="confetti confetti-5" />
        </div>
        <div className="relative">
          <div className="mx-auto mb-4 inline-flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Flame className="size-8" />
          </div>
          <h3 className="text-3xl font-black tracking-tight text-neutral-900">{title}</h3>
          <p className="mt-2 text-sm font-medium text-neutral-600">{subtitle}</p>
          <p className="mt-4 inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
            <CheckCircle2 className="size-3.5" />
            Streak progress updated
          </p>
        </div>
      </div>
    </div>
  );
}
