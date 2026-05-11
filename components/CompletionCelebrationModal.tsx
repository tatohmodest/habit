"use client";

import { CheckCircle2, Diamond, Flame } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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

/** Short sparkly “gem” hit — stacks with the main celebrate tone */
function playDiamondChime() {
  if (typeof window === "undefined") return;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const now = ctx.currentTime;
  const freqs = [990, 1318.5, 1568]; /* bright, Duolingo-ish */
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + i * 0.05);
    gain.gain.exponentialRampToValueAtTime(0.11, now + i * 0.05 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.05 + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + i * 0.06);
    osc.stop(now + i * 0.06 + 0.22);
  });
  setTimeout(() => void ctx.close(), 900);
}

export type DiamondRewardInfo = { previous: number; current: number };

export function CompletionCelebrationModal({
  open,
  title,
  subtitle,
  onClose,
  diamondReward,
}: {
  open: boolean;
  title: string;
  subtitle: string;
  onClose: () => void;
  diamondReward?: DiamondRewardInfo;
}) {
  const [displayCount, setDisplayCount] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!open) return;
    playCelebrateTone();
    if (diamondReward) {
      const t = setTimeout(() => playDiamondChime(), 280);
      return () => clearTimeout(t);
    }
  }, [open, diamondReward]);

  useEffect(() => {
    if (!open) {
      setDisplayCount(0);
      return;
    }
    if (!diamondReward) return;

    const { previous, current } = diamondReward;
    setDisplayCount(previous);
    const start = performance.now();
    const duration = 850;
    const delta = current - previous;

    function tick(now: number) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setDisplayCount(Math.round(previous + delta * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [open, diamondReward]);

  useEffect(() => {
    if (!open) return;
    const ms = diamondReward ? 6200 : 5000;
    const t = setTimeout(onClose, ms);
    return () => clearTimeout(t);
  }, [open, onClose, diamondReward]);

  if (!open) return null;

  const earned = diamondReward ? diamondReward.current - diamondReward.previous : 0;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 px-6 backdrop-blur-[2px]">
      <div className="celebrate-pop relative w-full max-w-sm overflow-hidden rounded-3xl bg-white p-8 text-center shadow-2xl">
        <div className="pointer-events-none absolute inset-0">
          <span className="confetti confetti-1" />
          <span className="confetti confetti-2" />
          <span className="confetti confetti-3" />
          <span className="confetti confetti-4" />
          <span className="confetti confetti-5" />
          {diamondReward ? (
            <>
              <span className="confetti-diamond confetti-diamond-1" />
              <span className="confetti-diamond confetti-diamond-2" />
              <span className="confetti-diamond confetti-diamond-3" />
            </>
          ) : null}
        </div>

        <div className="relative">
          {diamondReward ? (
            <div className="mb-5">
              <div className="diamond-ring mx-auto inline-flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-cyan-100 via-sky-50 to-indigo-100 p-1 shadow-inner">
                <div className="diamond-pop flex size-[5.25rem] items-center justify-center rounded-full bg-white shadow-lg ring-2 ring-cyan-200/80">
                  <Diamond
                    className="size-14 text-cyan-500 drop-shadow-md"
                    strokeWidth={2}
                    aria-hidden
                  />
                </div>
              </div>
              <p
                className="plus-one-rise mt-4 text-3xl font-black tracking-tight text-amber-500"
                style={{ textShadow: "0 2px 0 rgba(245, 158, 11, 0.35)" }}
              >
                +{earned}
              </p>
              <div className="mt-4 flex items-center justify-center gap-2 font-black tabular-nums">
                <span className="text-2xl text-neutral-400">{diamondReward.previous}</span>
                <span className="text-lg text-neutral-300">→</span>
                <span className="diamond-count-pop text-4xl text-cyan-600">{displayCount}</span>
              </div>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-cyan-700/90">
                Diamonds
              </p>
            </div>
          ) : (
            <div className="mx-auto mb-4 inline-flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Flame className="size-8" />
            </div>
          )}

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
