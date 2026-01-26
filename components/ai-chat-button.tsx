"use client";
import { Bot } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const AIChatButton = () => {
  const isChatPage = usePathname() === "/chat";

  if (isChatPage) return null;
  return (
    <Link
      className="fixed bottom-4 animate-bounce right-4 bg-green-600 hover:bg-green-700 text-white rounded-full p-4 shadow-lg z-50 duration-300"
      href="/chat"
    >
      <Bot className="h-6 w-6 animate-pulse" />
    </Link>
  );
};

export default AIChatButton;
