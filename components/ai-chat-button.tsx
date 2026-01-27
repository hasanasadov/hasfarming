"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Sparkles } from "lucide-react";

export default function AIChatButton() {
  const pathname = usePathname();
  const isChatPage = pathname === "/chat";

  if (isChatPage) return null;

  return (
    <Link
      href="/chat"
      aria-label="AI ilə danış"
      className={[
        "group fixed z-50 bottom-4 right-4",
        "flex items-center gap-2",
        "rounded-full border",
        "bg-emerald-600 text-white",
        "shadow-lg shadow-emerald-600/30",
        "hover:bg-emerald-700",
        "focus:outline-none focus:ring-2 focus:ring-emerald-400/60",
        "transition-all duration-300 ease-out",
        "pr-4 pl-4 py-3",
        "md:pr-5 md:pl-4",
        // soft float animation
        "animate-[float_6s_ease-in-out_infinite]",
      ].join(" ")}
    >
      {/* glow halo */}
      <span className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-emerald-500/30 blur-xl opacity-60" />

      {/* icon */}
      <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
        <Bot className="h-5 w-5" />
      </span>

      {/* text (desktop only, animated reveal) */}
      <span
        className={[
          "hidden md:inline-flex items-center gap-1",
          "max-w-0 overflow-hidden",
          "group-hover:max-w-[160px]",
          "transition-all duration-300 ease-out",
          "whitespace-nowrap text-sm font-medium",
        ].join(" ")}
      >
        <Sparkles className="h-4 w-4 opacity-80" />
        AI ilə danış
      </span>
    </Link>
  );
}
