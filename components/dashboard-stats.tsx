"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, Variants } from "framer-motion";
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
  Sparkles,
} from "lucide-react";
import type { WeatherData, FirebaseSensorData, Crop } from "@/lib/types";
import { useTranslation } from "@/lib/i18n";

interface DashboardStatsProps {
  weather?: WeatherData;
  sensorData?: FirebaseSensorData;
  forecast?: WeatherData[];
  crop?: Crop;
  dayIndex?: number;
  onDayIndexChange?: (index: number) => void;
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

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut", delay: i * 0.05 },
  }),
};

export function DashboardStats({
  weather,
  sensorData,
  forecast = [],
  crop,
  dayIndex,
  onDayIndexChange,
}: DashboardStatsProps) {
  const { t } = useTranslation();
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
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

  const day = forecast[activeIndex];
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
    if (!day) return t("stats.dailyAnalysis");
    return activeIndex === 0 ? t("common.today") : formatDateLabel(day.date);
  }, [day, activeIndex, t]);

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

    // daha “soft” vizual: destructive yalnız çox aşağı olanda
    const variant: "default" | "secondary" | "destructive" =
      total >= 72 ? "default" : total >= 50 ? "secondary" : "destructive";

    return { total, variant };
  }, [crop, shownTemp, shownHumidity, shownSoil]);

  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex < forecast.length - 1;

  const heroTempMax = Math.round(day?.tempMax ?? shownTemp);
  const heroTempMin = Math.round(day?.tempMin ?? shownTemp);

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show">
      <Card className="relative overflow-hidden border-border/60 bg-background/60 backdrop-blur">
        {/* subtle background wash */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-muted/40 via-background to-background" />

        <CardHeader className="relative pb-4">
          <motion.div
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="flex flex-wrap items-start justify-between gap-3"
          >
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-muted/40">
                  <CalendarDays className="h-4 w-4" />
                </span>
                <span>{title}</span>
              </CardTitle>

              <CardDescription className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/60 px-2.5 py-1 text-xs text-muted-foreground">
                  <RefreshCw className="h-3.5 w-3.5" />
                  {lastUpdate.toLocaleTimeString("az-AZ")}
                </span>

                {crop && healthBadge && (
                  <Badge variant={healthBadge.variant} className="gap-1">
                    <Sparkles className="h-3.5 w-3.5" />
                    {crop.nameAz} • {healthBadge.total}%
                  </Badge>
                )}

                {isToday && sensorData && (
                  <Badge variant="secondary" className="gap-1">
                    <Leaf className="h-3.5 w-3.5" />
                    {t("stats.sensorBased")}
                  </Badge>
                )}
              </CardDescription>
            </div>

            {/* day navigation */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setIndex(activeIndex - 1)}
                disabled={!hasPrev}
                className="rounded-full active:scale-95 transition"
                title={t("stats.prevDay")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="px-3 py-1.5 rounded-full border bg-background/60 text-xs text-muted-foreground">
                {activeIndex + 1}/{forecast.length || 1}
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setIndex(activeIndex + 1)}
                disabled={!hasNext}
                className="rounded-full active:scale-95 transition"
                title={t("stats.nextDay")}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </CardHeader>

        <CardContent className="relative space-y-4 pb-6">
          {/* HERO */}
          <motion.div
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="relative overflow-hidden rounded-2xl border bg-background/60 p-5 md:p-6"
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />

            <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="text-5xl leading-none select-none">
                  {day?.icon ?? "⛅"}
                </div>
                <div className="space-y-1">
                  <p className="text-3xl md:text-4xl font-semibold tracking-tight">
                    {heroTempMax}°{" "}
                    <span className="text-muted-foreground">/</span>{" "}
                    {heroTempMin}°
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {day?.description ?? weather?.description ?? "—"}
                  </p>
                </div>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 rounded-xl border bg-background/50 px-3 py-2">
                  <Thermometer className="h-4 w-4" />
                  <span className="text-muted-foreground">
                    {t("stats.average")}{" "}
                    <span className="text-foreground font-semibold">
                      {Math.round(shownTemp)}°C
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-2 rounded-xl border bg-background/50 px-3 py-2">
                  <Droplets className="h-4 w-4" />
                  <span className="text-muted-foreground">
                    {t("stats.humidity")}{" "}
                    <span className="text-foreground font-semibold">
                      {Math.round(shownHumidity)}%
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-2 rounded-xl border bg-background/50 px-3 py-2">
                  <Wind className="h-4 w-4" />
                  <span className="text-muted-foreground">
                    {t("stats.wind")}{" "}
                    <span className="text-foreground font-semibold">
                      {Math.round(shownWind)} km/s
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-2 rounded-xl border bg-background/50 px-3 py-2">
                  <Sun className="h-4 w-4" />
                  <span className="text-muted-foreground">
                    UV{" "}
                    <span className="text-foreground font-semibold">
                      {typeof shownUv === "number" ? shownUv.toFixed(1) : "—"}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* DETAILS */}
          <motion.div
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {/* Soil */}
            <div className="rounded-2xl border bg-background/60 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Leaf className="h-4 w-4" />
                {t("stats.soilMoisture")}
              </div>

              <p className="mt-2 text-3xl font-semibold tracking-tight">
                {Number.isFinite(shownSoil) ? `${Math.round(shownSoil)}%` : "—"}
              </p>

              <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${clamp(shownSoil || 0, 0, 100)}%` }}
                />
              </div>

              <p className="mt-2 text-xs text-muted-foreground">
                {isToday && sensorData
                  ? t("stats.sensorToday")
                  : t("stats.forecastBased")}
              </p>
            </div>

            {/* Rain */}
            <div className="rounded-2xl border bg-background/60 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CloudRain className="h-4 w-4" />
                {t("stats.rain")}
              </div>

              <p className="mt-2 text-3xl font-semibold tracking-tight">
                {typeof day?.precipitation === "number"
                  ? `${Math.round(day.precipitation)} mm`
                  : "—"}
              </p>

              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {typeof day?.precipitation === "number" &&
                day.precipitation >= 5
                  ? t("stats.rainLikely")
                  : t("stats.rainUnlikely")}
              </p>
            </div>

            {/* Fit */}
            <div className="rounded-2xl border bg-background/60 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Thermometer className="h-4 w-4" />
                {t("stats.cropFit")}
              </div>

              {!crop ? (
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  {t("stats.selectCropHint")}
                </p>
              ) : (
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">{t("stats.temperature")}</span>
                    <Badge
                      variant={
                        shownTemp < crop.optimalTemp.min ||
                        shownTemp > crop.optimalTemp.max
                          ? "secondary"
                          : "default"
                      }
                    >
                      {crop.optimalTemp.min}–{crop.optimalTemp.max}°C
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">{t("stats.humidity")}</span>
                    <Badge
                      variant={
                        shownHumidity < crop.optimalHumidity.min ||
                        shownHumidity > crop.optimalHumidity.max
                          ? "secondary"
                          : "default"
                      }
                    >
                      {crop.optimalHumidity.min}–{crop.optimalHumidity.max}%
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {t("stats.analysisBased")}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
