"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Cloud,
  Droplets,
  Wind,
  Sun,
  Thermometer,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Location, WeatherData } from "@/lib/types";
import Link from "next/link";

interface WeatherDisplayProps {
  location: Location;
  onWeatherData: (current: WeatherData, forecast: WeatherData[]) => void;
}

export function WeatherDisplay({
  location,
  onWeatherData,
}: WeatherDisplayProps) {
  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(
    null,
  );
  const [forecast, setForecast] = useState<WeatherData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchWeather = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/weather?lat=${location.lat}&lng=${location.lng}`,
        {
          cache: "no-store",
        },
      );

      if (!response.ok) throw new Error("Hava məlumatları alına bilmədi");

      const data = await response.json();

      // Sənin API: data.current + data.forecast qaytarır
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

      setCurrentWeather(current);
      setForecast(Array.isArray(data.forecast) ? data.forecast : []);
      setLastUpdate(new Date());
      onWeatherData(current, Array.isArray(data.forecast) ? data.forecast : []);
    } catch (err) {
      console.error("Weather fetch error:", err);
      setError("Hava məlumatları yüklənə bilmədi");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.lat, location.lng]);

  const formatDayLabel = (dateStr: string, index: number) => {
    if (index === 0) return "Bu gün";
    const d = new Date(dateStr);
    const days = ["Baz", "B.e", "Ç.a", "Ç", "C.a", "C", "Ş"];
    return days[d.getDay()];
  };

  const formatDateShort = (dateStr: string) => {
    const d = new Date(dateStr);
    // AZ format qısa: 23.01
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}.${mm}`;
  };

  // UI helpers
  const val = (x: any, fallback = "N/A") =>
    x === null || x === undefined || Number.isNaN(x) ? fallback : x;

  if (isLoading && !currentWeather) {
    return (
      <Card className="border-border/50 shadow-lg">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-44" />
            ))}
          </div>
          <Skeleton className="h-52" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50 shadow-lg">
        <CardContent className="py-6">
          <div className="text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchWeather} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Yenidən cəhd et
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 shadow-lg overflow-hidden">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Cloud className="h-5 w-5 text-primary" />
              Hava & Torpaq Məlumatları
            </CardTitle>
            <CardDescription>
              {location.address}
              {lastUpdate && (
                <span className="ml-2 text-xs">
                  (Yeniləndi: {lastUpdate.toLocaleTimeString("az-AZ")})
                </span>
              )}
            </CardDescription>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={fetchWeather}
            disabled={isLoading}
            title="Yenilə"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 1) CURRENT (böyük kart) */}
        {currentWeather && (
          <div className="rounded-2xl border border-primary/15 bg-primary/5 p-5">
            <div className="flex items-start justify-between gap-6">
              <div className="flex items-center gap-4">
                <span className="text-5xl">{currentWeather.icon}</span>
                <div>
                  <p className="text-4xl font-bold text-foreground">
                    {Math.round(currentWeather.temp)}°C
                  </p>
                  <p className="text-muted-foreground">
                    {currentWeather.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDateShort(currentWeather.date)} • Bu gün (cari)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-accent" />
                  <span className="text-muted-foreground">
                    Min/Max: {Math.round(currentWeather.tempMin)}° /{" "}
                    {Math.round(currentWeather.tempMax)}°
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">
                    Hava rütubəti: {Math.round(currentWeather.humidity)}%
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Wind className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Külək: {Math.round(currentWeather.windSpeed)} km/saat
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Sun className="h-4 w-4 text-accent" />
                  <span className="text-muted-foreground">
                    UV: {val(currentWeather.uvIndex, "N/A")}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Cloud className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Yağıntı: {val(currentWeather.precipitation, "0")} mm
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">
                    Torpaq nəmliyi:{" "}
                    {val(Math.round(currentWeather.soilMoisture ?? 0), "N/A")}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground">
              <p>7 Günlük Proqnoz</p>
              <span>(sağa sürüşdür)</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              <Link href="/settings" className="underline">
                Sensorum var
              </Link>
            </p>
          </div>

          {/* Horizontal scroll, böyük kartlar */}
          <div className="flex gap-4 overflow-x-auto pb-2 pr-1 [scrollbar-width:thin]">
            {forecast.map((day, index) => (
              <div
                key={day.date}
                className={`min-w-[320px] sm:min-w-[360px] rounded-2xl border p-5 shadow-sm transition-colors ${
                  index === 0
                    ? "border-primary/30 bg-primary/10"
                    : "border-border bg-card hover:border-primary/25"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {formatDayLabel(day.date, index)}
                      <span className="text-xs text-muted-foreground font-normal ml-2">
                        {formatDateShort(day.date)}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {day.description}
                    </p>
                  </div>

                  <span className="text-4xl leading-none">{day.icon}</span>
                </div>

                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <p className="text-4xl font-bold text-foreground">
                      {Math.round(day.tempMax)}°
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Min: {Math.round(day.tempMin)}°
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Orta</p>
                    <p className="text-lg font-semibold text-foreground">
                      {Math.round(day.temp)}°C
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">
                      Hava rütubəti: {val(Math.round(day.humidity ?? 0), "N/A")}
                      %
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Cloud className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Yağıntı: {val(day.precipitation, "N/A")} mm
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Wind className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Külək: {val(Math.round(day.windSpeed ?? 0), "N/A")}{" "}
                      km/saat
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4 text-accent" />
                    <span className="text-muted-foreground">
                      UV: {val(day.uvIndex, "N/A")}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 col-span-2">
                    <Droplets className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">
                      Torpaq nəmliyi:{" "}
                      {val(Math.round(day.soilMoisture ?? 0), "N/A")}%{" "}
                      <span className="text-xs opacity-70">(təxmini)</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
