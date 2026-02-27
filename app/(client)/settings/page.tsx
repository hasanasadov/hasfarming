"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Loader2,
  Link2,
  Cloud,
  Radio,
  RotateCcw,
} from "lucide-react";
import { useAppStore } from "@/lib/store/app-store";
import { FirebaseSensorDisplay } from "@/components/firebase-sensor-display";
import { useTranslation } from "@/lib/i18n";

function normalizeFirebaseBaseUrl(raw: string) {
  let url = (raw || "").trim();
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  url = url.replace(/\.json(\?.*)?$/i, "");
  url = url.replace(/\/+$/g, "");
  return url;
}

function isFirebaseLike(u: string) {
  return u.includes("firebaseio.com") || u.includes("firebasedatabase.app");
}

type UiState = "idle" | "testing" | "ok" | "error" | "connected";

export default function SettingsPage() {
  const { t } = useTranslation();
  const {
    dataSource,
    setDataSource,
    firebaseUrl,
    setFirebaseUrl,
    setSensorData,
    setSensorStatus,
    sensorStatus,
    sensorError,
  } = useAppStore();

  const [url, setUrl] = useState(
    firebaseUrl || "https://agrowise-c3772-default-rtdb.firebaseio.com",
  );

  const cleaned = useMemo(() => normalizeFirebaseBaseUrl(url), [url]);
  const connected = dataSource === "firebase" && !!firebaseUrl;

  const [ui, setUi] = useState<UiState>(connected ? "connected" : "idle");
  const [err, setErr] = useState<string | null>(null);

  const validate = useCallback(async () => {
    setErr(null);

    if (!cleaned) {
      setUi("error");
      return setErr(t("settings.urlEmpty"));
    }
    if (!isFirebaseLike(cleaned)) {
      setUi("error");
      return setErr(t("settings.urlInvalid"));
    }

    setUi("testing");

    try {
      const res = await fetch(
        `/api/firebase/validate?url=${encodeURIComponent(cleaned)}&t=${Date.now()}`,
        { cache: "no-store" },
      );

      const data = await res.json().catch(() => null);
      if (!data) throw new Error(t("settings.validateFailed"));
      if (!data.ok) throw new Error(data.error || t("settings.validateError"));

      setUi("ok");
      setErr(null);
    } catch (e: any) {
      setUi("error");
      setErr(e?.message || t("settings.validateGeneric"));
    }
  }, [cleaned, t]);

  const enableSensors = useCallback(() => {
    if (!cleaned) return;
    setFirebaseUrl(cleaned);
    setDataSource("firebase");
    localStorage.setItem("agrisense_firebase_url", cleaned);
    setUi("connected");
    setErr(null);
  }, [cleaned, setFirebaseUrl, setDataSource]);

  const disableSensors = useCallback(() => {
    setFirebaseUrl("");
    setDataSource("weather");
    localStorage.removeItem("agrisense_firebase_url");
    setUi("idle");
    setErr(null);
    setSensorData(null);
    setSensorStatus("idle");
  }, [setFirebaseUrl, setDataSource, setSensorData, setSensorStatus]);

  const statusBadge = useMemo(() => {
    if (ui === "testing")
      return (
        <Badge variant="secondary" className="gap-1 rounded-full">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t("settings.checking")}
        </Badge>
      );
    if (ui === "ok")
      return (
        <Badge variant="secondary" className="gap-1 rounded-full">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {t("settings.ready")}
        </Badge>
      );
    if (ui === "connected")
      return (
        <Badge variant="outline" className="gap-1 rounded-full">
          <Link2 className="h-3.5 w-3.5" />
          {t("settings.connected")}
        </Badge>
      );
    if (ui === "error")
      return (
        <Badge variant="destructive" className="rounded-full">
          {t("settings.problem")}
        </Badge>
      );
    return (
      <Badge variant="secondary" className="rounded-full">
        {t("settings.passive")}
      </Badge>
    );
  }, [ui, t]);

  return (
    <div className="space-y-6  md:px-0">
      <Card className="relative overflow-hidden border-border/60 bg-background/60 backdrop-blur">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-muted/40 via-background to-background" />

        <CardHeader className="relative">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-muted/40">
                  <Database className="h-4 w-4" />
                </span>
                {t("settings.dataSource")}
              </CardTitle>
              <CardDescription>
                {t("settings.dataSourceDesc")}
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              {sensorStatus === "error" && (
                <Badge variant="destructive" className="rounded-full">
                  {t("settings.sensorError")}
                </Badge>
              )}
              {statusBadge}
            </div>
          </div>

          {/* source pills */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge
              variant={dataSource === "weather" ? "default" : "secondary"}
              className="gap-1 rounded-full"
            >
              <Cloud className="h-3.5 w-3.5" />
              {t("settings.forecastApi")}
            </Badge>

            <Badge
              variant={dataSource === "firebase" ? "default" : "secondary"}
              className="gap-1 rounded-full"
            >
              <Radio className="h-3.5 w-3.5" />
              {t("settings.sensorFirebase")}
            </Badge>

            {connected && firebaseUrl && (
              <Badge variant="outline" className="gap-1 rounded-full">
                <Link2 className="h-3.5 w-3.5" />
                {t("settings.active")}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="relative space-y-4 pb-6">
          {/* Sensor setup block */}
          <div className="rounded-2xl border bg-background/60 p-4 md:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="text-sm font-semibold">
                  {t("settings.sensorSetup")}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("settings.sensorSetupDesc")}
                </div>
              </div>

              {/* small help hint */}
              <Badge variant="secondary" className="rounded-full">
                {t("settings.oneMinute")}
              </Badge>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
              <Input
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setUi(connected ? "connected" : "idle");
                  setErr(null);
                }}
                placeholder="https://xxxx-default-rtdb.firebaseio.com"
                className="rounded-xl"
              />

              <Button
                onClick={validate}
                variant="secondary"
                disabled={ui === "testing" || !cleaned}
                className="rounded-xl"
              >
                {ui === "testing" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {t("settings.testing")}
                  </>
                ) : (
                  t("settings.testBtn")
                )}
              </Button>
            </div>

            {/* status messages */}
            <div className="mt-3 space-y-2">
              {err && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5" />
                  <div className="leading-relaxed">{err}</div>
                </div>
              )}

              {ui === "ok" && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  {t("settings.testOk")}
                </div>
              )}

              {firebaseUrl && (
                <div className="rounded-xl border bg-muted/20 px-3 py-2 text-xs text-muted-foreground break-all">
                  {t("settings.activeUrl")} {firebaseUrl}
                </div>
              )}

              {sensorError && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive break-all">
                  {t("settings.sensorError")}: {sensorError}
                </div>
              )}
            </div>

            {/* actions */}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                onClick={enableSensors}
                disabled={ui !== "ok"}
                className="rounded-xl"
              >
                {t("settings.saveUse")}
              </Button>

              <Button
                onClick={disableSensors}
                variant="outline"
                disabled={!connected}
                className="rounded-xl"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {t("settings.disconnect")}
              </Button>
            </div>
          </div>

          {/* Live sensor display */}
          {dataSource === "firebase" && firebaseUrl && (
            <FirebaseSensorDisplay
              firebaseUrl={firebaseUrl}
              onSensorData={(d) => {
                setSensorData(d);
                setSensorStatus("connected");
              }}
              onError={() => setSensorStatus("error")}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
