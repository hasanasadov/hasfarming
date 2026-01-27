"use client";

import { Bot } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const AIChatButton = () => {
  const isChatPage = usePathname() === "/chat";
  if (isChatPage) return null;

  return (
    <Link
      href="/chat"
      className="
        fixed bottom-6 right-6 z-50
        flex items-center justify-center
        h-14 w-14 rounded-full
        bg-gradient-to-tr from-green-500 to-emerald-600
        text-white
        shadow-lg shadow-green-500/40
        transition-all duration-300
        hover:scale-110 hover:shadow-emerald-500/60
        animate-[float_4s_ease-in-out_infinite]
      "
      aria-label="AI Chat"
    >
      <Bot className="h-6 w-6 animate-pulse" />
    </Link>
  );
};

export default AIChatButton;
