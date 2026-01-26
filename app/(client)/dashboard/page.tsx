"use client";

import { RouteGuard } from "@/components/route-guard";
import { ContextPreview } from "@/components/context-preview";
import { DashboardStats } from "@/components/dashboard-stats";
import { Recommendations } from "@/components/recommendations";
import { useAppStore } from "@/lib/store/app-store";
import RenderIf from "@/lib/renderIf";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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
      <div className="md:space-y-6 ">
        <ContextPreview />
        <RenderIf condition={!!selectedCrop}>
          <Recommendations
            crop={selectedCrop!}
            weather={currentWeather || undefined}
            sensorData={sensorData || undefined}
            forecast={forecast}
            dayIndex={dayIndex}
          />
        </RenderIf>

        <div className="flex items-center justify-between gap-4 px-4 md:px-6 py-12 bg-gradient-to-r from-emerald-50 to-white dark:from-emerald-900 dark:to-emerald-900 md:rounded-xl shadow-sm">
          <div className="flex items-center gap-3">
            {/* <div className="flex items-center justify-center w-10 h-10 bg-emerald-100 !rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4-.8L3 21l1.2-4.2A7.955 7.955 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div> */}
            <div>
              <p className="text-sm font-semibold">Sualın var?</p>
              <p className="text-xs text-muted-foreground">
                AI ilə dərhal cavab al və tövsiyələr əldə et
              </p>
            </div>
          </div>

          <Link href="/chat" aria-label="AI ilə danışmağa başla">
            <Button className="bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transform transition duration-150 px-4 py-2 rounded-md shadow-md">
              AI ilə danışmağa başla
            </Button>
          </Link>
        </div>

        <DashboardStats
          weather={currentWeather || undefined}
          sensorData={sensorData || undefined}
          forecast={forecast}
          crop={selectedCrop || undefined}
          dayIndex={dayIndex}
          onDayIndexChange={setDayIndex}
        />
      </div>
    </RouteGuard>
  );
}
