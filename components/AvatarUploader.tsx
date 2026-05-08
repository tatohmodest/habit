"use client";

import { Camera, Loader2, User } from "lucide-react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ChangeEvent } from "react";

export function AvatarUploader({ avatarUrl }: { avatarUrl: string | null }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const [uploading, setUploading] = useState(false);

  async function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Upload failed");
      }
      router.refresh();
    } catch {
      // keep silent in UI for now; page remains usable
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="relative size-10 shrink-0">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative flex size-10 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-neutral-100"
        aria-label="Upload profile image"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="Profile avatar" className="size-full object-cover" />
        ) : (
          <User className="size-5 text-neutral-500" />
        )}
      </button>
      <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-primary text-white">
        {uploading ? <Loader2 className="size-3 animate-spin" /> : <Camera className="size-3" />}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
      />
    </div>
  );
}
