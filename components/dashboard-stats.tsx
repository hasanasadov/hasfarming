"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Droplets,
  Thermometer,
  Wind,
  Sun,
  CloudRain,
  Leaf,
  RefreshCw,
  CalendarDays,
} from "lucide-react";
import type { WeatherData, FirebaseSensorData, Crop } from "@/lib/types";

interface DashboardStatsProps {
  weather?: WeatherData; // currentWeather
  sensorData?: FirebaseSensorData; // optional
  forecast?: WeatherData[]; // 7 days
  crop?: Crop;
  dayIndex?: number; // controlled (optional)
  onDayIndexChange?: (index: number) => void; // controlled (optional)
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr);
  const wd = d.toLocaleDateString("az-AZ", { weekday: "long" });
  const dm = d.toLocaleDateString("az-AZ", { day: "2-digit", month: "long" });
  return `${wd}, ${dm}`;
}

export function DashboardStats({
  weather,
  sensorData,
  forecast = [],
  crop,
  dayIndex,
  onDayIndexChange,
}: DashboardStatsProps) {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // uncontrolled fallback
  const [internalIndex, setInternalIndex] = useState(0);

  const activeIndex = typeof dayIndex === "number" ? dayIndex : internalIndex;

  const setIndex = (next: number) => {
    const safe = clamp(next, 0, Math.max(0, forecast.length - 1));
    onDayIndexChange?.(safe);
    if (typeof dayIndex !== "number") setInternalIndex(safe);
  };

  useEffect(() => {
    setLastUpdate(new Date());
  }, [weather, sensorData, forecast, crop, activeIndex]);

  // ✅ selected day (forecast based)
  const day = forecast[activeIndex];

  // ✅ “Current KPI” yalnız bu gün üçün sensor üstün tutulsun,
  // amma sabah/sonrakılar 100% forecastdan getsin
  const isToday = activeIndex === 0;

  const shownTemp = isToday
    ? (sensorData?.airTemperature ?? weather?.temp ?? day?.temp ?? 0)
    : (day?.temp ?? 0);

  const shownHumidity = isToday
    ? (sensorData?.humidity ?? weather?.humidity ?? day?.humidity ?? 0)
    : (day?.humidity ?? 0);

  const shownSoil = isToday
    ? (sensorData?.soilMoisture ??
      weather?.soilMoisture ??
      day?.soilMoisture ??
      0)
    : (day?.soilMoisture ?? 0);

  const shownWind = isToday
    ? (weather?.windSpeed ?? day?.windSpeed ?? 0)
    : (day?.windSpeed ?? 0);
  const shownUv = isToday ? (weather?.uvIndex ?? day?.uvIndex) : day?.uvIndex;

  const title = useMemo(() => {
    if (!day) return "Günlük Analiz";
    return activeIndex === 0 ? "Bu gün" : formatDateLabel(day.date);
  }, [day, activeIndex]);

  const healthBadge = useMemo(() => {
    if (!crop) return null;

    const tempMid = (crop.optimalTemp.min + crop.optimalTemp.max) / 2;
    const humMid = (crop.optimalHumidity.min + crop.optimalHumidity.max) / 2;

    const tempScore = clamp(100 - Math.abs(shownTemp - tempMid) * 6, 0, 100);
    const humScore = clamp(
      100 - Math.abs(shownHumidity - humMid) * 2.2,
      0,
      100,
    );

    const soilScore =
      shownSoil < 40
        ? clamp(100 - (40 - shownSoil) * 4, 0, 100)
        : shownSoil > 70
          ? clamp(100 - (shownSoil - 70) * 4, 0, 100)
          : 100;

    const total = Math.round(
      tempScore * 0.42 + humScore * 0.33 + soilScore * 0.25,
    );

    const variant: "default" | "secondary" | "destructive" =
      total >= 70 ? "default" : total >= 45 ? "secondary" : "destructive";

    return { total, variant };
  }, [crop, shownTemp, shownHumidity, shownSoil]);

  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex < forecast.length - 1;

  return (
    <Card className="border-border/50 shadow-lg overflow-hidden py-12">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <CalendarDays className="h-5 w-5 text-primary" />
              {title}
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                Yeniləndi: {lastUpdate.toLocaleTimeString("az-AZ")}
              </span>

              {crop && healthBadge && (
                <Badge variant={healthBadge.variant}>
                  {crop.nameAz} • Sağlamlıq: {healthBadge.total}%
                </Badge>
              )}

              {isToday && sensorData && (
                <Badge variant="secondary" className="gap-1">
                  <Leaf className="h-3.5 w-3.5" />
                  Sensor prioritet
                </Badge>
              )}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              className="rounded-full p-1.5 w-fit h-fit cursor-pointer"
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setIndex(activeIndex - 1)}
              disabled={!hasPrev}
              title="Əvvəlki gün"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="px-3 py-1.5 rounded-full border border-border bg-muted/30 text-xs text-muted-foreground">
              {activeIndex + 1}/{forecast.length || 1}
            </div>

            <Button
              className="rounded-full p-1.5 w-fit h-fit cursor-pointer"
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setIndex(activeIndex + 1)}
              disabled={!hasNext}
              title="Sonrakı gün"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Hero row */}
        <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="text-5xl">{day?.icon ?? "⛅"}</div>
              <div>
                <p className="text-4xl font-extrabold text-foreground">
                  {Math.round(day?.tempMax ?? shownTemp)}° /{" "}
                  {Math.round(day?.tempMin ?? shownTemp)}°
                </p>
                <p className="text-sm text-muted-foreground">
                  {day?.description ?? weather?.description ?? "—"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">
                  Orta:{" "}
                  <span className="text-foreground font-semibold">
                    {Math.round(shownTemp)}°C
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">
                  Rütubət:{" "}
                  <span className="text-foreground font-semibold">
                    {Math.round(shownHumidity)}%
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Wind className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">
                  Külək:{" "}
                  <span className="text-foreground font-semibold">
                    {Math.round(shownWind)} km/saat
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">
                  UV:{" "}
                  <span className="text-foreground font-semibold">
                    {typeof shownUv === "number" ? shownUv.toFixed(1) : "N/A"}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Details cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Leaf className="h-4 w-4 text-primary" />
              Torpaq nəmliyi
            </div>
            <p className="mt-2 text-3xl font-extrabold text-foreground">
              {shownSoil ? `${Math.round(shownSoil)}%` : "—"}
            </p>
            <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary"
                style={{ width: `${clamp(shownSoil || 0, 0, 100)}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {isToday && sensorData
                ? "Sensor datası varsa prioritet odur."
                : "Hava məlumatından təxmini hesablanır."}
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CloudRain className="h-4 w-4 text-primary" />
              Yağış
            </div>
            <p className="mt-2 text-3xl font-extrabold text-foreground">
              {typeof day?.precipitation === "number"
                ? `${Math.round(day.precipitation)} mm`
                : "—"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {typeof day?.precipitation === "number" && day.precipitation >= 5
                ? "Yağış ehtimalı yüksəkdir — suvarmanı azalt."
                : "Yağış azdır — suvarma planını nəzərdən keçir."}
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Thermometer className="h-4 w-4 text-primary" />
              Bitki üçün uyğunluq
            </div>

            {!crop ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Bitki seçsən, uyğunluq analizi daha dəqiq olacaq.
              </p>
            ) : (
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Temp aralığı</span>
                  <Badge
                    variant={
                      shownTemp < crop.optimalTemp.min ||
                      shownTemp > crop.optimalTemp.max
                        ? "destructive"
                        : "default"
                    }
                  >
                    {crop.optimalTemp.min}–{crop.optimalTemp.max}°C
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Rütubət aralığı</span>
                  <Badge
                    variant={
                      shownHumidity < crop.optimalHumidity.min ||
                      shownHumidity > crop.optimalHumidity.max
                        ? "destructive"
                        : "default"
                    }
                  >
                    {crop.optimalHumidity.min}–{crop.optimalHumidity.max}%
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Bu analiz seçilmiş günün göstəricilərinə əsaslanır.
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
