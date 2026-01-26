"use client";

import { RouteGuard } from "@/components/route-guard";
import { ContextPreview } from "@/components/context-preview";
import { AIChat } from "@/components/ai-chat";
import { useAppStore } from "@/lib/store/app-store";

export default function ChatPage() {
  const {
    location,
    selectedCrop,
    currentWeather,
    sensorData,
    forecast,
    dayIndex,
    dataSource,
  } = useAppStore();

  return (
    <div>
      {/* <RouteGuard need={["location", "weather", "crop"]}> */}
      {/* <div className="space-y-6"> */}
      <ContextPreview />

      <AIChat
        location={location}
        crop={selectedCrop}
        weather={currentWeather}
        sensorData={sensorData}
        forecast={forecast}
        dayIndex={dayIndex}
        dataSource={dataSource}
      />
      {/* </div> */}
      {/* </RouteGuard> */}
    </div>
  );
}
