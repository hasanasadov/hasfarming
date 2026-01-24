"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store/app-store";

export function ContextPreview() {
  const { location, selectedCrop, dayIndex, forecast, dataSource, sensorData } =
    useAppStore();

  const d = forecast?.[dayIndex];

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border bg-muted/20">
      <Badge variant="secondary">
        📍 {location?.address?.split(",")[0] ?? "Məkan yoxdur"}
      </Badge>
      <Badge className="flex gap-1 items-center" variant="secondary">
        <div>{selectedCrop?.icon}</div>
        <div>{selectedCrop?.nameAz ?? "Bitki yoxdur"}</div>
      </Badge>
      <Badge variant="secondary">
        🗓 {dayIndex === 0 ? "Bu gün" : `Gün ${dayIndex + 1}`}
      </Badge>
      <Badge variant="secondary">
        {dataSource === "firebase" ? "📡 Sensor" : "☁️ Hava Proqnozu"}
      </Badge>

      {d && (
        <>
          <Badge>
            🌡 {Math.round(d.tempMax)}° / {Math.round(d.tempMin)}°
          </Badge>
          <Badge>🌧 {Math.round(d.precipitation)} mm</Badge>
          <Badge>
            💧{" "}
            {dataSource === "firebase" &&
            dayIndex === 0 &&
            sensorData?.soilMoisture != null
              ? `${Math.round(sensorData.soilMoisture)}% (sensor)`
              : `${Math.round(d.soilMoisture ?? 0)}% (təxmin)`}
          </Badge>
        </>
      )}

      <div className="ml-auto flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href="/weather">Məkanı dəyiş</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/crops">Bitkini dəyiş</Link>
        </Button>
      </div>
    </div>
  );
}
