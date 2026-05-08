import * as Lucide from "lucide-react";
import type { LucideIcon } from "lucide-react";

const Fallback = Lucide.CircleDot;

export function HabitIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = (Lucide as Record<string, LucideIcon>)[name] ?? Fallback;
  return <Icon className={className} aria-hidden />;
}
