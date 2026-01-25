"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store/app-store";

export function ContextPreview() {
  const { location, selectedCrop, dayIndex, forecast, dataSource, sensorData } =
    useAppStore();

  const d = forecast?.[dayIndex];

  const soilDisplay =
    dataSource === "firebase" &&
    dayIndex === 0 &&
    sensorData?.soilMoisture != null
      ? `${Math.round(sensorData.soilMoisture)}%`
      : d
        ? `${Math.round(d.soilMoisture ?? 0)}%`
        : "—";

  return (
    <div className="flex items-center gap-3 p-4 md:rounded-xl border border-white/6 bg-white/4 text-xs">
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm"
        style={{ background: "#4b5563" }}
      >
        {selectedCrop?.icon ?? "🌱"}
      </div>

      <div className="flex-1 min-w-0">
        <div className="truncate font-medium">
          {selectedCrop?.nameAz ?? "Bitki yoxdur"}
        </div>
        <div className="flex gap-3 text-muted-foreground mt-0.5">
          <div className="flex items-center gap-1">
            <span>🌡</span>
            <span>
              {d ? `${Math.round(d.tempMax)}°/${Math.round(d.tempMin)}°` : "—"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span>💧</span>
            <span>{soilDisplay}</span>
          </div>
          <div className="flex items-center gap-1">
            <span>📍</span>
            <span className="truncate">
              {location?.address?.split(",")[0] ?? "Məkan yoxdur"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-1 md:gap-4">
        <Button asChild size="sm" variant="outline" className="p-1 md:px-3">
          <Link href="/weather" aria-label="Məkanı dəyiş">
            📍 <span className="hidden md:inline-block">Məkanı dəyiş</span>
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="p-1 md:px-3">
          <Link href="/crops" aria-label="Bitkini dəyiş">
            🌱 <span className="hidden md:inline-block">Bitkini dəyiş</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
