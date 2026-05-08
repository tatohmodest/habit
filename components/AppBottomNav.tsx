"use client";

import { BarChart2, Home, ListChecks, Receipt } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home", Icon: Home, match: /^\/$/ },
  { href: "/habits", label: "Habits", Icon: ListChecks },
  { href: "/spending", label: "Spend", Icon: Receipt },
  { href: "/review", label: "Review", Icon: BarChart2 },
];

export function AppBottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-200 bg-white px-4 pb-safe pt-2 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
      <div className="mx-auto flex max-w-lg gap-2 pb-3 pt-2">
        {links.map(({ href, label, Icon, match }) => {
          const active = match
            ? match.test(pathname)
            : pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center justify-end gap-1 rounded-full py-1 transition-colors ${
                active ? "text-primary" : "text-neutral-400 hover:text-neutral-600"
              }`}
            >
              <Icon
                className={`size-6 ${active ? "stroke-[2.5px]" : "stroke-2"}`}
                aria-hidden
              />
              <span className="text-xs font-medium tracking-wide">{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
