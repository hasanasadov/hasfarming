import React from "react";
import { AppShellPro } from "@/components/app-shell-pro";
import { SensorListener } from "@/components/sensor-listener";
import AIChatButton from "@/components/ai-chat-button";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative">
      <SensorListener />
      <AppShellPro>{children}</AppShellPro>
      <AIChatButton />
    </div>
  );
}
