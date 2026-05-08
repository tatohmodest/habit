"use client";

import { Lock, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type React from "react";

function PinDots({ value }: { value: string }) {
  return (
    <div className="mb-4 flex justify-center gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <span
          key={i}
          className={`size-3 rounded-full border-2 ${
            i < value.length ? "border-primary bg-primary" : "border-neutral-300 bg-white"
          }`}
        />
      ))}
    </div>
  );
}

function Keypad({
  value,
  onValue,
}: {
  value: string;
  onValue: React.Dispatch<React.SetStateAction<string>>;
}) {
  const append = (digit: string) => {
    if (value.length >= 6) return;
    onValue((v) => `${v}${digit}`);
  };
  return (
    <div className="mx-auto grid w-[280px] grid-cols-3 gap-3">
      {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((k, i) =>
        k ? (
          <button
            key={`${k}-${i}`}
            type="button"
            onClick={() => (k === "del" ? onValue((v) => v.slice(0, -1)) : append(k))}
            className="h-16 rounded-full border border-neutral-200 bg-white text-lg font-bold text-neutral-900 shadow-sm transition active:scale-95"
          >
            {k === "del" ? "⌫" : k}
          </button>
        ) : (
          <span key={`e-${i}`} />
        )
      )}
    </div>
  );
}

export function SavingsAccessScreen({ hasAccount }: { hasAccount: boolean }) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [setupStep, setSetupStep] = useState<"create" | "confirm">("create");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/savings/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          hasAccount ? { action: "unlock", pin } : { action: "setup", pin, confirmPin }
        ),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      if (hasAccount) {
        router.push("/spending/savings");
      } else {
        setPin("");
        setConfirmPin("");
        setSetupStep("create");
        router.push("/spending/savings/access");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to continue");
    } finally {
      setLoading(false);
    }
  }

  function goToConfirm() {
    if (pin.length < 4) {
      setError("Use at least 4 digits for your PIN.");
      return;
    }
    setError(null);
    setSetupStep("confirm");
  }

  return (
    <div className="min-h-screen bg-background px-4 pb-10 pt-8 text-foreground">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="inline-flex items-center gap-2 text-xl font-black text-neutral-900">
            <Lock className="size-5 text-primary" />
            {hasAccount ? "Enter PIN" : "Create Savings PIN"}
          </h1>
          <button
            type="button"
            onClick={() => router.push("/spending")}
            className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {!hasAccount && (
          <div className="mb-8 overflow-hidden rounded-xl border border-neutral-200 bg-white p-4">
            <div
              className={`flex w-[200%] transition-transform duration-300 ease-out ${
                setupStep === "create" ? "translate-x-0" : "-translate-x-1/2"
              }`}
            >
              <div className="w-1/2 shrink-0 pr-2">
                <p className="mb-2 text-sm font-semibold text-neutral-800">Create PIN</p>
                <PinDots value={pin} />
                <Keypad value={pin} onValue={setPin} />
                <button
                  type="button"
                  onClick={goToConfirm}
                  className="mt-4 w-full rounded-xl bg-primary py-3 text-sm font-bold text-white"
                >
                  Continue
                </button>
              </div>

              <div className="w-1/2 shrink-0 pl-2">
                <p className="mb-2 text-sm font-semibold text-neutral-800">Confirm PIN</p>
                <PinDots value={confirmPin} />
                <Keypad value={confirmPin} onValue={setConfirmPin} />
                <button
                  type="button"
                  onClick={() => setSetupStep("create")}
                  className="mt-4 w-full rounded-xl border border-neutral-200 py-3 text-sm font-semibold text-neutral-700"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        )}

        {hasAccount && (
          <div className="mb-8 rounded-xl border border-neutral-200 bg-white p-4">
            <p className="mb-2 text-sm font-semibold text-neutral-800">PIN code</p>
            <PinDots value={pin} />
            <Keypad value={pin} onValue={setPin} />
          </div>
        )}

        {error && <p className="mb-4 text-sm font-semibold text-red-600">{error}</p>}

        {(hasAccount || setupStep === "confirm") && (
          <button
            type="button"
            disabled={loading}
            onClick={onSubmit}
            className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {loading ? "Please wait..." : hasAccount ? "Unlock savings" : "Create savings account"}
          </button>
        )}
      </div>
    </div>
  );
}

