"use client";

import { RouteGuard } from "@/components/route-guard";
import { ContextPreview } from "@/components/context-preview";
import { DashboardStats } from "@/components/dashboard-stats";
import { Recommendations } from "@/components/recommendations";
import { useAppStore } from "@/lib/store/app-store";

export default function DashboardPage() {
  const {
    currentWeather,
    forecast,
    sensorData,
    selectedCrop,
    dayIndex,
    setDayIndex,
  } = useAppStore();

  return (
    <RouteGuard need={["location", "weather", "crop"]}>
      <div className="space-y-6">
        <ContextPreview />

        <DashboardStats
          weather={currentWeather || undefined}
          sensorData={sensorData || undefined}
          forecast={forecast}
          crop={selectedCrop || undefined}
          dayIndex={dayIndex}
          onDayIndexChange={setDayIndex}
        />

        {selectedCrop && (
          <Recommendations
            crop={selectedCrop}
            weather={currentWeather || undefined}
            sensorData={sensorData || undefined}
            forecast={forecast}
            dayIndex={dayIndex}
          />
        )}
      </div>
    </RouteGuard>
  );
}
