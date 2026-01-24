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
import { useAppStore } from "@/lib/store/app-store";

interface FirebaseSensorDisplayProps {
  firebaseUrl: string; // base url: https://xxx.firebaseio.com
  onSensorData: (data: FirebaseSensorData) => void;
  onError?: (message: string) => void;
}

function toNumberOrNull(x: any) {
  if (x === undefined || x === null) return null;
  const n = typeof x === "string" ? Number(x) : x;
  return Number.isFinite(n) ? Number(n) : null;
}

/**
 * payload-lar fərqlidir:
 * - { soil: {...}, isWorking: true }
 * - { moisture: 70, humidity: 60, temperature: 22, nit: 10, phos: 5, pot: 80 }
 * - { "-Nx..": {...}, "-Ny..": {...} }  (push id)
 */
function pickSensorObject(payload: any) {
  if (!payload) return null;

  if (payload.soil && typeof payload.soil === "object") return payload.soil;
  if (payload.data && typeof payload.data === "object") return payload.data;
  if (payload.readings && typeof payload.readings === "object")
    return payload.readings;

  const keys = Object.keys(payload);
  const likely = [
    "moisture",
    "humidity",
    "temperature",
    "soilMoisture",
    "soilTemperature",
    "airTemperature",
    "ph",
    "nit",
    "phos",
    "pot",
    "nitrogen",
    "phosphorus",
    "potassium",
    "timestamp",
  ];
  if (keys.some((k) => likely.includes(k))) return payload;

  // root push-id strukturu
  if (keys.length && keys.every((k) => typeof payload[k] === "object")) {
    const values = keys.map((k) => payload[k]).filter(Boolean);
    const withTs = values
      .map((v) => ({
        v,
        ts: v?.timestamp ?? v?.time ?? v?.createdAt ?? v?.updatedAt ?? 0,
      }))
      .sort((a, b) => Number(b.ts) - Number(a.ts));
    if (withTs[0]?.v) return withTs[0].v;
  }

  return null;
}

function parseSensor(raw: any): FirebaseSensorData {
  const soilMoisture =
    toNumberOrNull(raw.soilMoisture) ??
    toNumberOrNull(raw.soil_moisture) ??
    toNumberOrNull(raw.moisture) ??
    toNumberOrNull(raw.soilHumidity) ??
    toNumberOrNull(raw.soil_humidity) ??
    50;

  const soilTemperature =
    toNumberOrNull(raw.soilTemperature) ??
    toNumberOrNull(raw.soil_temperature) ??
    toNumberOrNull(raw.soil_temp) ??
    toNumberOrNull(raw.soilTemp) ??
    toNumberOrNull(raw.temperature_soil) ??
    toNumberOrNull(raw.temperature) ??
    20;

  const airTemperature =
    toNumberOrNull(raw.airTemperature) ??
    toNumberOrNull(raw.air_temperature) ??
    toNumberOrNull(raw.air_temp) ??
    toNumberOrNull(raw.temp) ??
    toNumberOrNull(raw.temperature_air) ??
    toNumberOrNull(raw.temperature) ??
    25;

  const humidity =
    toNumberOrNull(raw.humidity) ??
    toNumberOrNull(raw.air_humidity) ??
    toNumberOrNull(raw.rh) ??
    60;

  const ph =
    toNumberOrNull(raw.ph) ??
    toNumberOrNull(raw.pH) ??
    toNumberOrNull(raw.soilPh) ??
    undefined;

  const nitrogen =
    toNumberOrNull(raw.nitrogen) ??
    toNumberOrNull(raw.n) ??
    toNumberOrNull(raw.nit) ??
    undefined;

  const phosphorus =
    toNumberOrNull(raw.phosphorus) ??
    toNumberOrNull(raw.p) ??
    toNumberOrNull(raw.phos) ??
    undefined;

  const potassium =
    toNumberOrNull(raw.potassium) ??
    toNumberOrNull(raw.k) ??
    toNumberOrNull(raw.pot) ??
    undefined;

  const timestamp =
    toNumberOrNull(raw.timestamp) ?? toNumberOrNull(raw.time) ?? Date.now();

  return {
    soilMoisture,
    soilTemperature,
    airTemperature,
    humidity,
    ph,
    nitrogen,
    phosphorus,
    potassium,
    timestamp,
  };
}

export function FirebaseSensorDisplay({
  firebaseUrl,
  onSensorData,
  onError,
}: FirebaseSensorDisplayProps) {
  const cached = useAppStore((s) => s.sensorData);
  const lastSensorAt = useAppStore((s) => s.lastSensorAt);
  const [sensorData, setSensorData] = useState<FirebaseSensorData | null>(
    cached,
  );
  const [isLoading, setIsLoading] = useState(!cached);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isStale = lastSensorAt ? Date.now() - lastSensorAt > 60_000 : false; // 1 dəqiqə

  const [showRaw, setShowRaw] = useState(false);
  const [rawPreview, setRawPreview] = useState<any>(null);

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);
  const backoffRef = useRef<number>(5000);

  const base = useMemo(() => (firebaseUrl || "").trim(), [firebaseUrl]);

  const scheduleNext = useCallback((ms: number) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(
      () => void fetchSensorData("poll"),
      ms,
    );
  }, []);

  const fetchSensorData = useCallback(
    async (mode: "initial" | "manual" | "poll" = "poll") => {
      if (!base) return;

      if (mode === "poll" && document.visibilityState !== "visible") {
        scheduleNext(backoffRef.current);
        return;
      }

      abortRef.current?.abort();
      abortRef.current = new AbortController();

      if (mode === "initial") setIsLoading(true);
      if (mode === "manual") setIsRefreshing(true);

      try {
        const endpoint = `/api/firebase/read?url=${encodeURIComponent(
          base,
        )}&t=${Date.now()}`;

        const res = await fetch(endpoint, {
          method: "GET",
          cache: "no-store",
          signal: abortRef.current.signal,
        });

        const data = await res.json().catch(() => null);

        if (!res.ok || !data) {
          throw new Error("Server read failed");
        }

        if (!data.ok) {
          if (showRaw) setRawPreview(data);
          throw new Error(data.error || "Firebase read returned ok:false");
        }

        const json = data.payload;
        const picked = pickSensorObject(json);

        if (!picked) {
          if (showRaw) setRawPreview(json);
          throw new Error("No compatible sensor object found");
        }

        const reading = parseSensor(picked);

        setSensorData(reading);
        setLastUpdate(new Date());
        setIsConnected(true);
        setError(null);
        onSensorData(reading);

        if (showRaw) setRawPreview(json);

        backoffRef.current = 5000;
        scheduleNext(backoffRef.current);
      } catch (err: any) {
        if (err?.name === "AbortError") return;

        const msg =
          err?.message || "Firebase-dən məlumat alına bilmədi (format/icazə).";
        setError(msg);
        setIsConnected(false);
        onError?.(msg);

        backoffRef.current = Math.min(backoffRef.current * 2, 60000);
        scheduleNext(backoffRef.current);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [base, onSensorData, onError, scheduleNext, showRaw],
  );

  useEffect(() => {
    fetchSensorData("initial");

    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchSensorData("poll");
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
                {base}
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

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRaw((v) => !v)}
              className="text-xs"
              title="Debug (raw JSON)"
            >
              {showRaw ? "Debug: ON" : "Debug"}
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

        {showRaw && (
          <div className="mt-4">
            <pre className="text-xs p-3 rounded-lg bg-muted/50 border overflow-auto max-h-64">
              {JSON.stringify(rawPreview, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
