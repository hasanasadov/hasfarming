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
  RefreshCw,
  Wifi,
  WifiOff,
  AlertTriangle,
  ChevronDown,
  Activity,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { FirebaseSensorData } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "@/lib/i18n";

interface FirebaseSensorDisplayProps {
  firebaseUrl: string; // base url: https://xxx.firebaseio.com
  onSensorData: (data: FirebaseSensorData) => void;
  onError?: (message: string) => void;
}

function normalizeFirebaseBaseUrl(raw: string) {
  let url = (raw || "").trim();
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  url = url.replace(/\.json(\?.*)?$/i, "");
  url = url.replace(/\/+$/g, "");
  return url;
}

function isRecord(x: unknown): x is Record<string, any> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function toNumberOrNull(x: any) {
  if (x === undefined || x === null) return null;
  const n = typeof x === "string" ? Number(x) : x;
  return Number.isFinite(n) ? Number(n) : null;
}

function toBooleanOrNull(x: any) {
  if (typeof x === "boolean") return x;
  if (typeof x === "string") {
    const normalized = x.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
  }
  if (typeof x === "number" && Number.isFinite(x)) return x !== 0;
  return null;
}

/**
 * payload-lar fərqlidir:
 * - { sensor_data: { humidity, isWorking, moisture, temperatureAir, temperatureSoil, timestamp } }
 * - { soil: {...}, isWorking: true }
 * - { moisture: 70, humidity: 60, temperature: 22, nit: 10, phos: 5, pot: 80 }
 * - { "-Nx..": {...}, "-Ny..": {...} }  (push id)
 */
function pickSensorObject(payload: any) {
  if (!isRecord(payload)) return null;

  if (isRecord(payload.sensor_data)) return payload.sensor_data;
  if (payload.soil && typeof payload.soil === "object") return payload.soil;
  if (payload.data && typeof payload.data === "object") return payload.data;
  if (payload.readings && typeof payload.readings === "object")
    return payload.readings;

  const keys = Object.keys(payload);
  const likely = [
    "moisture",
    "humidity",
    "temperature",
    "temperatureAir",
    "temperatureSoil",
    "soilMoisture",
    "soilTemperature",
    "isWorking",
    "ph",
    "nit",
    "phos",
    "pot",
    "timestamp",
  ];
  if (keys.some((k) => likely.includes(k))) return payload;

  // root push-id strukturu
  if (keys.length && keys.every((k) => isRecord(payload[k]))) {
    const values = keys.map((k) => payload[k]).filter(isRecord);
    const withTs = values
      .map((v) => ({
        v,
        ts:
          v?.sensor_data?.timestamp ??
          v?.timestamp ??
          v?.time ??
          v?.createdAt ??
          v?.updatedAt ??
          0,
      }))
      .sort((a, b) => Number(b.ts) - Number(a.ts));
    if (withTs[0]?.v) return withTs[0].v;
  }

  return null;
}

function parseSensor(raw: any): FirebaseSensorData {
  const sensor = isRecord(raw?.sensor_data)
    ? raw.sensor_data
    : isRecord(raw)
      ? raw
      : {};

  const moisture =
    toNumberOrNull(sensor.moisture) ??
    toNumberOrNull(sensor.soilMoisture) ??
    toNumberOrNull(sensor.soil_moisture) ??
    toNumberOrNull(sensor.soilHumidity) ??
    toNumberOrNull(sensor.soil_humidity) ??
    50;

  const temperatureSoil =
    toNumberOrNull(sensor.temperatureSoil) ??
    toNumberOrNull(sensor.soilTemperature) ??
    toNumberOrNull(sensor.soil_temperature) ??
    toNumberOrNull(sensor.soil_temp) ??
    toNumberOrNull(sensor.soilTemp) ??
    toNumberOrNull(sensor.temperature_soil) ??
    toNumberOrNull(sensor.temperature) ??
    20;

  const temperatureAir =
    toNumberOrNull(sensor.temperatureAir) ??
    toNumberOrNull(sensor.airTemperature) ??
    toNumberOrNull(sensor.air_temperature) ??
    toNumberOrNull(sensor.air_temp) ??
    toNumberOrNull(sensor.temp) ??
    toNumberOrNull(sensor.temperature_air) ??
    toNumberOrNull(sensor.temperature) ??
    25;

  const humidity =
    toNumberOrNull(sensor.humidity) ??
    toNumberOrNull(sensor.air_humidity) ??
    toNumberOrNull(sensor.rh) ??
    60;

  const isWorking =
    toBooleanOrNull(sensor.isWorking) ??
    toBooleanOrNull(sensor.working) ??
    toBooleanOrNull(sensor.online) ??
    true;

  const timestamp =
    toNumberOrNull(sensor.timestamp) ?? toNumberOrNull(sensor.time) ?? Date.now();

  return {
    humidity,
    isWorking,
    moisture,
    temperatureAir,
    temperatureSoil,
    timestamp,
  };
}

type ConnState = "connected" | "degraded" | "disconnected";

function msAgo(ts: number) {
  return Date.now() - ts;
}
function fmtAge(ms: number) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m} dəq`;
}

export function FirebaseSensorDisplay({
  firebaseUrl,
  onSensorData,
  onError,
}: FirebaseSensorDisplayProps) {
  const { t } = useTranslation();
  const base = useMemo(
    () => normalizeFirebaseBaseUrl(firebaseUrl),
    [firebaseUrl],
  );

  const [showRaw, setShowRaw] = useState(false);
  const [rawPreview, setRawPreview] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // ✅ loop fix: callback-ları ref-də saxla
  const onSensorDataRef = useRef(onSensorData);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onSensorDataRef.current = onSensorData;
  }, [onSensorData]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // ✅ flapping olmasın
  const failCountRef = useRef(0);
  const [conn, setConn] = useState<ConnState>("disconnected");

  const query = useQuery({
    queryKey: ["firebase-sensor", base],
    enabled: !!base,
    queryFn: async () => {
      const res = await fetch(`${base}/.json?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Firebase read failed: ${res.status}`);

      const json = await res.json().catch(() => null);
      if (!json) throw new Error("Firebase payload empty");

      const picked = pickSensorObject(json);
      if (!picked) throw new Error("No sensor object found");

      const reading = parseSensor(picked);
      return { reading, raw: json };
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    retry: 1,
    staleTime: 0,
    gcTime: 1000 * 60 * 5,
    placeholderData: (prev) => prev, // keep last data while fetching
  });

  // ✅ yalnız “data yenilənəndə” handle et
  const lastHandledAtRef = useRef<number>(0);

  useEffect(() => {
    if (!query.data) return;
    if (query.dataUpdatedAt === lastHandledAtRef.current) return;
    lastHandledAtRef.current = query.dataUpdatedAt;

    failCountRef.current = 0;
    setConn(query.data.reading.isWorking ? "connected" : "disconnected");
    setLastUpdate(new Date());

    if (showRaw) setRawPreview(query.data.raw);

    onSensorDataRef.current(query.data.reading);
  }, [query.data, query.dataUpdatedAt, showRaw]);

  useEffect(() => {
    if (!query.isError) return;

    failCountRef.current += 1;

    // 1-2 error: degraded, 3+: disconnected
    if (failCountRef.current >= 3) setConn("disconnected");
    else setConn((c) => (c === "connected" ? "degraded" : c));

    const msg =
      query.error instanceof Error ? query.error.message : t("sensor.firebaseError");

    onErrorRef.current?.(msg);
  }, [query.isError, query.error]);

  const sensorData = query.data?.reading;

  const freshness = useMemo(() => {
    if (!sensorData?.timestamp) return { stale: false, ageMs: 0 };
    const ageMs = msAgo(sensorData.timestamp);
    return { stale: ageMs > 60_000, ageMs };
  }, [sensorData?.timestamp]);

  const statusBadge = useMemo(() => {
    const baseClass =
      "h-7 px-3 rounded-full inline-flex items-center gap-1 leading-none shrink-0";
    if (conn === "connected") {
      return (
        <Badge className={baseClass} variant="default">
          <Wifi className="h-3.5 w-3.5" />
          {t("sensor.connected")}
        </Badge>
      );
    }
    if (conn === "degraded") {
      return (
        <Badge className={baseClass} variant="secondary">
          <AlertTriangle className="h-3.5 w-3.5" />
          {t("sensor.degraded")}
        </Badge>
      );
    }
    return (
      <Badge className={baseClass} variant="destructive">
        <WifiOff className="h-3.5 w-3.5" />
        {t("sensor.disconnected")}
      </Badge>
    );
  }, [conn, t]);

  const freshnessBadge = useMemo(() => {
    if (!sensorData?.timestamp) return null;

    const cls =
      "h-7 px-3 rounded-full inline-flex items-center gap-1 leading-none shrink-0";
    return (
      <Badge
        className={cls}
        variant={freshness.stale ? "secondary" : "outline"}
        title={t("sensor.freshness")}
      >
        <Activity className="h-3.5 w-3.5" />
        {freshness.stale
          ? `${t("sensor.stale")} • ${fmtAge(freshness.ageMs)}`
          : `${t("sensor.live")} • ${fmtAge(freshness.ageMs)}`}
      </Badge>
    );
  }, [sensorData?.timestamp, freshness]);

  const valueTone = useCallback(
    (value: number, optimal: { min: number; max: number }) => {
      if (value >= optimal.min && value <= optimal.max)
        return "border-primary/20 bg-primary/5";
      const far = value < optimal.min - 10 || value > optimal.max + 10;
      return far
        ? "border-destructive/20 bg-destructive/5"
        : "border-amber-500/20 bg-amber-500/10";
    },
    [],
  );

  const StatCard = ({
    icon,
    label,
    value,
    sub,
    tone,
  }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    sub?: string;
    tone: string;
  }) => (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-background/50 p-4 ${tone}`}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border bg-muted/30">
          {icon}
        </span>
        <span className="font-medium">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      {sub && (
        <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>
      )}
    </div>
  );

  if (query.isLoading && !sensorData) {
    return (
      <Card className="border-border/60 bg-background/60 backdrop-blur">
        <CardHeader>
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
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
                <Database className="h-4 w-4" />
              </span>
              {t("sensor.liveTitle")}
            </CardTitle>

            {/* ✅ 2-row description => badges tort kimi yığılmır */}
            <CardDescription className="space-y-2">
              <div className="text-muted-foreground">
                Firebase Realtime Database
              </div>

              {/* ✅ badges: single-row scroll (premium) */}
              <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pr-1 no-scrollbar">
                {statusBadge}
                {freshnessBadge}
              </div>
            </CardDescription>
          </div>

          <div className="flex items-center justify-between gap-2 sm:justify-end">
            {lastUpdate && (
              <span className="hidden sm:block text-xs text-muted-foreground">
                {lastUpdate.toLocaleTimeString("az-AZ", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="rounded-xl"
                onClick={() => query.refetch()}
                disabled={query.isFetching}
                title={t("sensor.refresh")}
              >
                <RefreshCw
                  className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`}
                />
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="rounded-xl gap-2"
                onClick={() => setShowRaw((v) => !v)}
                title={t("sensor.debug")}
              >
                Debug
                <ChevronDown
                  className={`h-4 w-4 transition ${showRaw ? "rotate-180" : ""}`}
                />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-4">
        {/* quiet error */}
        {query.isError && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5" />
              <div className="min-w-0">
                <div className="text-sm font-medium">{t("sensor.readError")}</div>
                <div className="text-xs text-muted-foreground break-words">
                  {query.error instanceof Error
                    ? query.error.message
                    : t("sensor.errorOccurred")}
                </div>
<div className="text-[11px] text-muted-foreground mt-1">
                  {t("sensor.errorHint")}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  * 3 ardıcıl uğursuz oxunuşdan sonra “kəsildi” kimi
                  göstəriləcək.
                </div>
              </div>
            </div>
          </div>
        )}

        {sensorData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              icon={<Droplets className="h-4 w-4" />}
              label={t("sensor.soilMoisture")}
              value={`${sensorData.moisture.toFixed(1)}%`}
              sub={`${t("sensor.optimal")}: 40–70%`}
              tone={valueTone(sensorData.moisture, { min: 40, max: 70 })}
            />

            <StatCard
              icon={<Thermometer className="h-4 w-4" />}
              label={t("sensor.soilTemp")}
              value={`${sensorData.temperatureSoil.toFixed(1)}°C`}
              sub={`${t("sensor.optimal")}: 15–25°C`}
              tone={valueTone(sensorData.temperatureSoil, { min: 15, max: 25 })}
            />

            <StatCard
              icon={<Thermometer className="h-4 w-4" />}
              label={t("sensor.airTemp")}
              value={`${sensorData.temperatureAir.toFixed(1)}°C`}
              sub={`${t("sensor.optimal")}: 18–30°C`}
              tone={valueTone(sensorData.temperatureAir, { min: 18, max: 30 })}
            />

            <StatCard
              icon={<Wind className="h-4 w-4" />}
              label={t("sensor.airHumidity")}
              value={`${sensorData.humidity.toFixed(1)}%`}
              sub={`${t("sensor.optimal")}: 50–70%`}
              tone={valueTone(sensorData.humidity, { min: 50, max: 70 })}
            />
          </div>
        )}

        {/* Debug collapsible */}
        <AnimatePresence initial={false}>
          {showRaw && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl border bg-muted/20 p-3">
                <pre className="text-[11px] leading-relaxed overflow-auto max-h-72">
                  {JSON.stringify(
                    rawPreview ?? query.data?.raw ?? null,
                    null,
                    2,
                  )}
                </pre>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
