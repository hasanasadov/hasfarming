"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Cloud,
  Droplets,
  Wind,
  Sun,
  Thermometer,
  RefreshCw,
  MapPin,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Location, WeatherData } from "@/lib/types";
import Link from "next/link";

interface WeatherDisplayProps {
  location: Location;
  onWeatherData: (current: WeatherData, forecast: WeatherData[]) => void;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}`;
}

function formatDayLabel(dateStr: string, index: number) {
  if (index === 0) return "Bu gün";
  const d = new Date(dateStr);
  const days = ["Baz", "B.e", "Ç.a", "Ç", "C.a", "C", "Ş"];
  return days[d.getDay()];
}

function val(x: any, fallback = "N/A") {
  return x === null || x === undefined || Number.isNaN(x) ? fallback : x;
}

function comfortBadge(temp: number, humidity: number) {
  // super-light heuristic: feels nice for farming dashboard
  const score =
    100 -
    Math.abs(temp - 22) * 3 -
    Math.abs(humidity - 55) * 0.9;

  const s = clamp(Math.round(score), 0, 100);
  if (s >= 75) return { label: `Rahat • ${s}%`, variant: "default" as const };
  if (s >= 55) return { label: `Normal • ${s}%`, variant: "secondary" as const };
  return { label: `Sərt • ${s}%`, variant: "destructive" as const };
}

export function WeatherDisplay({ location, onWeatherData }: WeatherDisplayProps) {
  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<WeatherData[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // ✅ loop olmaması üçün callback ref
  const onWeatherRef = useRef(onWeatherData);
  useEffect(() => {
    onWeatherRef.current = onWeatherData;
  }, [onWeatherData]);

  const query = useQuery({
    queryKey: ["weather", location.lat, location.lng],
    enabled: Number.isFinite(location.lat) && Number.isFinite(location.lng),
    queryFn: async () => {
      const response = await fetch(
        `/api/weather?lat=${location.lat}&lng=${location.lng}`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("Hava məlumatları alına bilmədi");
      return response.json();
    },
    refetchInterval: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
    staleTime: 0,
    gcTime: 1000 * 60 * 10,
    placeholderData: (prev) => prev, // ✅ refresh zamanı UI “jump” eləməsin
  });

  useEffect(() => {
    if (!query.data) return;

    const data = query.data;
    const todayForecast = data.forecast?.[0];

    const current: WeatherData = {
      date: new Date().toISOString().split("T")[0],
      temp: data.current.temp,
      tempMin: todayForecast?.tempMin ?? data.current.temp - 3,
      tempMax: todayForecast?.tempMax ?? data.current.temp + 3,
      humidity: data.current.humidity,
      precipitation: data.current.precipitation,
      windSpeed: data.current.windSpeed,
      uvIndex: data.current.uvIndex,
      description: data.current.description,
      icon: data.current.icon,
      soilMoisture: todayForecast?.soilMoisture ?? 50,
    };

    const nextForecast: WeatherData[] = Array.isArray(data.forecast)
      ? data.forecast
      : [];

    setCurrentWeather(current);
    setForecast(nextForecast);
    setLastUpdate(new Date());

    onWeatherRef.current(current, nextForecast);
  }, [query.data]);

  const isLoading = query.isLoading && !currentWeather;
  const isRefreshing = query.isFetching;
  const hasSoftError = query.isError && !!currentWeather;

  const locTitle =
    location.address?.split(",")[0]?.trim() || "Seçilmiş məkan";

  const headlineBadge = useMemo(() => {
    if (!currentWeather) return null;
    return comfortBadge(currentWeather.temp, currentWeather.humidity);
  }, [currentWeather]);

  if (isLoading) {
    return (
      <Card className="border-border/60 bg-background/60 backdrop-blur overflow-hidden">
        <CardHeader>
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-52 rounded-2xl" />
        </CardContent>
      </Card>
    );
  }

  if (query.isError && !currentWeather) {
    return (
      <Card className="border-border/60 bg-background/60 backdrop-blur">
        <CardContent className="py-8">
          <div className="mx-auto max-w-md rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-700 dark:text-amber-300" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  Hava məlumatlarını ala bilmədik
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Bağlantını yoxlayın və yenidən cəhd edin.
                </p>
              </div>
            </div>

            <div className="mt-3 flex justify-end">
              <Button onClick={() => query.refetch()} variant="outline" className="rounded-xl">
                <RefreshCw className="h-4 w-4 mr-2" />
                Yenidən cəhd et
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden border-border/60 bg-background/60 backdrop-blur">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-muted/40 via-background to-background" />

      <CardHeader className="relative">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <CardTitle className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-muted/40">
                <Cloud className="h-4 w-4" />
              </span>
              Hava & Torpaq
            </CardTitle>

            <CardDescription className="space-y-2">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">{locTitle}</span>
              </div>

              {/* ✅ badges ayrı sətr + horizontal scroll => tort olmur */}
              <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pr-1 no-scrollbar">
                {headlineBadge && (
                  <Badge variant={headlineBadge.variant} className="h-7 px-3 rounded-full shrink-0">
                    {headlineBadge.label}
                  </Badge>
                )}

                {lastUpdate && (
                  <Badge variant="secondary" className="h-7 px-3 rounded-full shrink-0">
                    Yeniləndi:{" "}
                    {lastUpdate.toLocaleTimeString("az-AZ", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Badge>
                )}

                {hasSoftError && (
                  <Badge variant="secondary" className="h-7 px-3 rounded-full shrink-0 gap-2">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Yeniləmə zəifdir (son məlumat göstərilir)
                  </Badge>
                )}
              </div>
            </CardDescription>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl"
              onClick={() => query.refetch()}
              disabled={isRefreshing}
              title="Yenilə"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>

            <Link href="/settings" className="hidden sm:block">
              <Button variant="outline" className="rounded-xl">
                Sensorum var
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-5">
        {/* 1) CURRENT HERO */}
        {currentWeather && (
          <div className="rounded-2xl border border-primary/15 bg-primary/5 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex items-center gap-4">
                <span className="text-5xl">{currentWeather.icon}</span>
                <div className="min-w-0">
                  <div className="flex items-end gap-3">
                    <p className="text-4xl font-semibold tracking-tight">
                      {Math.round(currentWeather.temp)}°C
                    </p>
                    <p className="text-sm text-muted-foreground pb-1">
                      {Math.round(currentWeather.tempMin)}° / {Math.round(currentWeather.tempMax)}°
                    </p>
                  </div>

                  <p className="text-sm text-muted-foreground mt-1">
                    {currentWeather.description}
                  </p>

                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDateShort(currentWeather.date)} • Bu gün
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">
                    Rütubət:{" "}
                    <span className="text-foreground font-semibold">
                      {Math.round(currentWeather.humidity)}%
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Wind className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Külək:{" "}
                    <span className="text-foreground font-semibold">
                      {Math.round(currentWeather.windSpeed)} km/saat
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Sun className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                  <span className="text-muted-foreground">
                    UV:{" "}
                    <span className="text-foreground font-semibold">
                      {val(currentWeather.uvIndex, "N/A")}
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Cloud className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Yağıntı:{" "}
                    <span className="text-foreground font-semibold">
                      {val(currentWeather.precipitation, "0")} mm
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-2 col-span-2">
                  <Droplets className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">
                    Torpaq nəmliyi:{" "}
                    <span className="text-foreground font-semibold">
                      {val(Math.round(currentWeather.soilMoisture ?? 0), "N/A")}%
                    </span>
                    <span className="text-xs opacity-70"> (təxmini)</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2) FORECAST */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-foreground">
                7 Günlük proqnoz
              </div>
              <div className="text-xs text-muted-foreground">
                Sağa sürüşdürərək baxın
              </div>
            </div>

            <Link href="/settings" className="sm:hidden">
              <Button variant="outline" size="sm" className="rounded-xl">
                Sensorum var
              </Button>
            </Link>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 pr-1 no-scrollbar">
            {forecast.map((day, index) => (
              <div
                key={day.date}
                className={[
                  "min-w-[280px] sm:min-w-[320px] rounded-2xl border p-4",
                  "bg-background/60 transition-colors",
                  index === 0
                    ? "border-primary/20 bg-primary/5"
                    : "border-border/60 hover:border-primary/15",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-foreground">
                        {formatDayLabel(day.date, index)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateShort(day.date)}
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground line-clamp-1">
                      {day.description}
                    </div>
                  </div>

                  <div className="text-4xl leading-none">{day.icon}</div>
                </div>

                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <div className="text-3xl font-semibold tracking-tight">
                      {Math.round(day.tempMax)}°
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Min: {Math.round(day.tempMin)}°
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Orta</div>
                    <div className="text-lg font-semibold">
                      {Math.round(day.temp)}°C
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">
                      {val(Math.round(day.humidity ?? 0), "N/A")}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Cloud className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {val(day.precipitation, "N/A")} mm
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Wind className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {val(Math.round(day.windSpeed ?? 0), "N/A")} km/saat
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                    <span className="text-muted-foreground">
                      {val(day.uvIndex, "N/A")}
                    </span>
                  </div>

                  <div className="col-span-2 flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">
                      Torpaq nəmliyi: {val(Math.round(day.soilMoisture ?? 0), "N/A")}%
                      <span className="text-xs opacity-70"> (təxmini)</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {isRefreshing && (
            <div className="text-xs text-muted-foreground">Yenilənir…</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
