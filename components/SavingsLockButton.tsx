"use client";

import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SavingsLockButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onLock() {
    setLoading(true);
    try {
      await fetch("/api/savings/access", { method: "DELETE" });
    } finally {
      router.push("/spending/savings/access");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={onLock}
      className="inline-flex items-center gap-1 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-bold text-neutral-700 disabled:opacity-60"
    >
      <Lock className="size-3.5" />
      {loading ? "Locking..." : "Lock"}
    </button>
  );
}

