"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { HABIT_ICON_KEYS } from "@/lib/habit-icons";
import { HabitIcon } from "@/components/HabitIcon";

const CATEGORIES = ["spiritual", "financial", "behavioral", "discipline"] as const;
const TYPES = ["boolean", "threshold", "counter"] as const;
const FREQUENCIES = ["daily", "weekly"] as const;

export function HabitEditor({ habitId }: { habitId?: string }) {
  const router = useRouter();
  const editing = Boolean(habitId);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [iconKey, setIconKey] = useState<string>("CircleDot");
  const [color, setColor] = useState("#ec5b13");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("discipline");
  const [type, setType] = useState<(typeof TYPES)[number]>("boolean");
  const [frequency, setFrequency] = useState<(typeof FREQUENCIES)[number]>("daily");
  const [isPinned, setIsPinned] = useState(false);
  const [thresholdValue, setThresholdValue] = useState("");
  const [thresholdUnit, setThresholdUnit] = useState("XAF");

  useEffect(() => {
    if (!habitId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/habits/${habitId}`);
        if (!res.ok) throw new Error("Failed to load habit");
        const data = (await res.json()) as { habit: Record<string, unknown> };
        const h = data.habit;
        if (cancelled) return;
        setName(typeof h.name === "string" ? h.name : "");
        setDescription(typeof h.description === "string" ? h.description : "");
        setIconKey(typeof h.iconKey === "string" ? h.iconKey : "CircleDot");
        setColor(typeof h.color === "string" ? h.color : "#ec5b13");
        if (
          typeof h.category === "string" &&
          CATEGORIES.includes(h.category as (typeof CATEGORIES)[number])
        ) {
          setCategory(h.category as (typeof CATEGORIES)[number]);
        }
        if (typeof h.type === "string" && TYPES.includes(h.type as (typeof TYPES)[number])) {
          setType(h.type as (typeof TYPES)[number]);
        }
        if (
          typeof h.frequency === "string" &&
          FREQUENCIES.includes(h.frequency as (typeof FREQUENCIES)[number])
        ) {
          setFrequency(h.frequency as (typeof FREQUENCIES)[number]);
        }
        setIsPinned(h.isPinned === true);
        if (h.thresholdValue != null) {
          setThresholdValue(String(h.thresholdValue));
        }
        if (typeof h.thresholdUnit === "string") setThresholdUnit(h.thresholdUnit);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [habitId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name,
        description,
        iconKey,
        color,
        category,
        type,
        frequency,
        isPinned,
      };
      if (type === "threshold") {
        body.thresholdValue = thresholdValue ? Number(thresholdValue) : null;
        body.thresholdUnit = thresholdUnit || null;
      }

      const url = editing ? `/api/habits/${habitId}` : "/api/habits";
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push("/habits");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!habitId) return;
    if (
      !confirm(
        "Delete this habit? This permanently removes the habit and all of its logs/history."
      )
    ) {
      return;
    }
    const typed = prompt('Type "DELETE" to confirm habit deletion');
    if (typed !== "DELETE") return;
    setSaving(true);
    try {
      const res = await fetch(`/api/habits/${habitId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      router.push("/habits");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-8 animate-spin text-primary" aria-label="Loading" />
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 px-4 pb-28 pt-2">
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Name
        </label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-neutral-900 outline-none ring-primary focus:ring-2"
          placeholder="Morning prayer"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Description (optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-[88px] w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-neutral-900 outline-none ring-primary focus:ring-2"
          placeholder="Why this habit matters"
        />
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Icon
        </p>
        <div className="flex flex-wrap gap-2">
          {HABIT_ICON_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setIconKey(key)}
              className={`flex size-11 items-center justify-center rounded-xl border ${
                iconKey === key
                  ? "border-primary bg-orange-50 text-primary"
                  : "border-neutral-200 bg-white text-neutral-600"
              }`}
              aria-label={key}
            >
              <HabitIcon name={key} className="size-5" />
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Accent color
          </label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-11 w-full cursor-pointer rounded-xl border border-neutral-200 bg-white"
          />
        </div>
        <div className="flex flex-col justify-end">
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="size-4 rounded border-neutral-300 text-primary focus:ring-primary"
            />
            Pin on home
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Category
          </label>
          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as (typeof CATEGORIES)[number])
            }
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-neutral-900 outline-none ring-primary focus:ring-2"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as (typeof TYPES)[number])}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-neutral-900 outline-none ring-primary focus:ring-2"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Frequency
          </label>
          <select
            value={frequency}
            onChange={(e) =>
              setFrequency(e.target.value as (typeof FREQUENCIES)[number])
            }
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-neutral-900 outline-none ring-primary focus:ring-2"
          >
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
      </div>

      {type === "threshold" && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Threshold value
            </label>
            <input
              value={thresholdValue}
              onChange={(e) => setThresholdValue(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-neutral-900 outline-none ring-primary focus:ring-2"
              inputMode="decimal"
              placeholder="10000"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Unit
            </label>
            <input
              value={thresholdUnit}
              onChange={(e) => setThresholdUnit(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-neutral-900 outline-none ring-primary focus:ring-2"
              placeholder="XAF"
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={saving}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-bold text-white shadow-md shadow-primary/25 transition active:scale-[0.99] disabled:opacity-60"
        >
          {saving ? <Loader2 className="size-5 animate-spin" /> : null}
          {editing ? "Save changes" : "Create habit"}
        </button>
        <Link
          href="/habits"
          className="rounded-xl border border-neutral-200 py-3.5 text-center font-semibold text-neutral-700 sm:px-6"
        >
          Cancel
        </Link>
      </div>

      {editing && (
        <button
          type="button"
          onClick={onDelete}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
        >
          <Trash2 className="size-4" aria-hidden />
          Delete habit
        </button>
      )}
    </form>
  );
}
