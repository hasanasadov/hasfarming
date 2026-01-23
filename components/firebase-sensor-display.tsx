// components/firebase-sensor-display.tsx
"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Database,
  Droplets,
  Thermometer,
  Wind,
  FlaskConical,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { FirebaseSensorData } from "@/lib/types";

interface FirebaseSensorDisplayProps {
  firebaseUrl: string;
  onSensorData: (data: FirebaseSensorData) => void;
}

function normalizeFirebaseJsonUrl(raw: string) {
  let url = raw.trim();
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
  url = url.replace(/\.json$/i, "");
  url = url.replace(/\/+$/g, "");
  return `${url}.json`;
}

export function FirebaseSensorDisplay({
  firebaseUrl,
  onSensorData,
}: FirebaseSensorDisplayProps) {
  const [sensorData, setSensorData] = useState<FirebaseSensorData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);
  const backoffRef = useRef<number>(5000); // start 5s

  const jsonUrl = useMemo(
    () => normalizeFirebaseJsonUrl(firebaseUrl),
    [firebaseUrl],
  );

  const parseSensor = (data: any): FirebaseSensorData => ({
    soilMoisture:
      data.soilMoisture ?? data.soil_moisture ?? data.moisture ?? 50,
    soilTemperature:
      data.soilTemperature ?? data.soil_temperature ?? data.soil_temp ?? 20,
    airTemperature:
      data.airTemperature ??
      data.air_temperature ??
      data.temperature ??
      data.temp ??
      25,
    humidity: data.humidity ?? data.air_humidity ?? 60,
    ph: data.ph ?? data.pH ?? undefined,
    nitrogen: data.nitrogen ?? data.n ?? undefined,
    phosphorus: data.phosphorus ?? data.p ?? undefined,
    potassium: data.potassium ?? data.k ?? undefined,
    timestamp: data.timestamp ?? Date.now(),
  });

  const scheduleNext = useCallback((ms: number) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      void fetchSensorData("poll");
    }, ms);
  }, []);

  const fetchSensorData = useCallback(
    async (mode: "initial" | "manual" | "poll" = "poll") => {
      // tab hidden olarsa poll etmə
      if (mode === "poll" && document.visibilityState !== "visible") {
        scheduleNext(backoffRef.current);
        return;
      }

      abortRef.current?.abort();
      abortRef.current = new AbortController();

      if (mode === "initial") setIsLoading(true);
      if (mode === "manual") setIsRefreshing(true);

      try {
        // cache bust
        const urlWithTs = `${jsonUrl}?t=${Date.now()}`;

        const response = await fetch(urlWithTs, {
          method: "GET",
          cache: "no-store",
          signal: abortRef.current.signal,
        });

        if (!response.ok) throw new Error(`Firebase status ${response.status}`);

        const data = await response.json();

        if (!data) throw new Error("Empty firebase payload");

        const reading = parseSensor(data);

        setSensorData(reading);
        setLastUpdate(new Date());
        setIsConnected(true);
        setError(null);
        onSensorData(reading);

        // uğurlu oldu → backoff reset (5s)
        backoffRef.current = 5000;
      } catch (err: any) {
        if (err?.name === "AbortError") return;

        console.error("Sensor data fetch error:", err);
        setError("Firebase-dən məlumat alına bilmədi");
        setIsConnected(false);

        // xəta → backoff artır (max 60s)
        backoffRef.current = Math.min(backoffRef.current * 2, 60000);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);

        // növbəti poll
        scheduleNext(backoffRef.current);
      }
    },
    [jsonUrl, onSensorData, scheduleNext],
  );

  useEffect(() => {
    fetchSensorData("initial");

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        // geri qayıdanda dərhal yenilə
        fetchSensorData("poll");
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      abortRef.current?.abort();
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [fetchSensorData]);

  const getStatusColor = (
    value: number,
    optimal: { min: number; max: number },
  ) => {
    if (value >= optimal.min && value <= optimal.max)
      return "bg-primary/20 text-primary border-primary/30";
    if (value < optimal.min - 10 || value > optimal.max + 10)
      return "bg-destructive/20 text-destructive border-destructive/30";
    return "bg-accent/20 text-accent-foreground border-accent/30";
  };

  if (isLoading && !sensorData) {
    return (
      <Card className="border-border/50 shadow-lg">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 shadow-lg overflow-hidden">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Database className="h-5 w-5 text-primary" />
              Canlı Sensor Məlumatları
            </CardTitle>
            <CardDescription className="flex items-center gap-2 flex-wrap">
              Firebase Realtime Database
              <Badge
                variant={isConnected ? "default" : "destructive"}
                className="gap-1"
              >
                {isConnected ? (
                  <Wifi className="h-3 w-3" />
                ) : (
                  <WifiOff className="h-3 w-3" />
                )}
                {isConnected ? "Bağlı" : "Bağlantı kəsildi"}
              </Badge>
              <span className="text-xs text-muted-foreground truncate max-w-[520px]">
                {jsonUrl}
              </span>
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {lastUpdate && (
              <span className="text-xs text-muted-foreground">
                {lastUpdate.toLocaleTimeString("az-AZ", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fetchSensorData("manual")}
              disabled={isRefreshing}
              title="Yenilə"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 mb-4">
            <p className="text-sm text-destructive">{error}</p>
            <p className="text-xs text-muted-foreground mt-1">
              * Xəta olduqda yenilənmə intervalı avtomatik artırılır (backoff).
            </p>
          </div>
        )}

        {sensorData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div
              className={`p-4 rounded-xl border ${getStatusColor(sensorData.soilMoisture, { min: 40, max: 70 })}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Droplets className="h-4 w-4" />
                <span className="text-xs font-medium">Torpaq Nəmliyi</span>
              </div>
              <p className="text-2xl font-bold">
                {sensorData.soilMoisture.toFixed(1)}%
              </p>
              <p className="text-xs opacity-70">Optimal: 40–70%</p>
            </div>

            <div
              className={`p-4 rounded-xl border ${getStatusColor(sensorData.soilTemperature, { min: 15, max: 25 })}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Thermometer className="h-4 w-4" />
                <span className="text-xs font-medium">Torpaq Temp.</span>
              </div>
              <p className="text-2xl font-bold">
                {sensorData.soilTemperature.toFixed(1)}°C
              </p>
              <p className="text-xs opacity-70">Optimal: 15–25°C</p>
            </div>

            <div
              className={`p-4 rounded-xl border ${getStatusColor(sensorData.airTemperature, { min: 18, max: 30 })}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Thermometer className="h-4 w-4" />
                <span className="text-xs font-medium">Hava Temp.</span>
              </div>
              <p className="text-2xl font-bold">
                {sensorData.airTemperature.toFixed(1)}°C
              </p>
              <p className="text-xs opacity-70">Optimal: 18–30°C</p>
            </div>

            <div
              className={`p-4 rounded-xl border ${getStatusColor(sensorData.humidity, { min: 50, max: 70 })}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Wind className="h-4 w-4" />
                <span className="text-xs font-medium">Hava Rütubəti</span>
              </div>
              <p className="text-2xl font-bold">
                {sensorData.humidity.toFixed(1)}%
              </p>
              <p className="text-xs opacity-70">Optimal: 50–70%</p>
            </div>

            {sensorData.ph !== undefined && (
              <div
                className={`p-4 rounded-xl border ${getStatusColor(sensorData.ph, { min: 6.0, max: 7.0 })}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <FlaskConical className="h-4 w-4" />
                  <span className="text-xs font-medium">pH</span>
                </div>
                <p className="text-2xl font-bold">{sensorData.ph.toFixed(1)}</p>
                <p className="text-xs opacity-70">Optimal: 6.0–7.0</p>
              </div>
            )}

            {sensorData.nitrogen !== undefined && (
              <div className="p-4 rounded-xl border bg-card">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Azot (N)
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {sensorData.nitrogen} mg/kg
                </p>
              </div>
            )}

            {sensorData.phosphorus !== undefined && (
              <div className="p-4 rounded-xl border bg-card">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Fosfor (P)
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {sensorData.phosphorus} mg/kg
                </p>
              </div>
            )}

            {sensorData.potassium !== undefined && (
              <div className="p-4 rounded-xl border bg-card">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Kalium (K)
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {sensorData.potassium} mg/kg
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-xs text-muted-foreground">
            Məlumatlar avtomatik yenilənir. Tab arxa plandadırsa polling
            dayanır. Rənglər:{" "}
            <span className="text-primary ml-2">Yaşıl=Optimal</span>,
            <span className="ml-2">Sarı=Diqqət</span>,
            <span className="text-destructive ml-2">Qırmızı=Kritik</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
