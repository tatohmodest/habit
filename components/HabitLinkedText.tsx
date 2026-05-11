"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/** Opens Bible.com verse-of-the-day in the browser / Bible App when installed */
export const BIBLE_LINK_HREF = "https://www.bible.com/verse-of-the-day";

const BIBLE_TAG = /\[bible\]([\s\S]*?)\[\/bible\]/gi;

type Props = {
  text: string;
  className?: string;
};

/**
 * Renders habit titles/descriptions with clickable spans:
 * `Read [bible]Scripture[/bible] daily` → link around “Scripture”.
 */
export function HabitLinkedText({ text, className }: Props) {
  const segments: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  const re = new RegExp(BIBLE_TAG.source, BIBLE_TAG.flags);
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      segments.push(text.slice(last, match.index));
    }
    const inner = (match[1] ?? "").trim() || "Bible";
    segments.push(
      <Link
        key={`hl-${key++}`}
        href={BIBLE_LINK_HREF}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-primary underline decoration-primary/35 underline-offset-[3px]"
        onClick={(e) => e.stopPropagation()}
      >
        {inner}
      </Link>
    );
    last = re.lastIndex;
  }
  if (last < text.length) {
    segments.push(text.slice(last));
  }

  return <span className={className}>{segments}</span>;
}
