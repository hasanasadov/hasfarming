// app/(app)/settings/page.tsx
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
} from "lucide-react";
import { useAppStore } from "@/lib/store/app-store";
import { FirebaseSensorDisplay } from "@/components/firebase-sensor-display";

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

export default function SettingsPage() {
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
  const [isValidating, setIsValidating] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const cleaned = useMemo(() => normalizeFirebaseBaseUrl(url), [url]);
  const connected = dataSource === "firebase" && !!firebaseUrl;

  const validate = useCallback(async () => {
    setErr(null);
    setOk(false);

    if (!cleaned) return setErr("Firebase URL daxil edin");
    if (!isFirebaseLike(cleaned))
      return setErr(
        "Realtime Database URL düzgün deyil (firebaseio.com olmalıdır)",
      );

    setIsValidating(true);

    try {
      const res = await fetch(
        `/api/firebase/validate?url=${encodeURIComponent(cleaned)}&t=${Date.now()}`,
        { cache: "no-store" },
      );

      const data = await res.json().catch(() => null);

      if (!data) throw new Error("Validate cavabı boş gəldi");
      if (!data.ok) throw new Error(data.error || "Validate alınmadı");

      setOk(true);
      setErr(null);
    } catch (e: any) {
      setOk(false);
      setErr(e?.message || "Yoxlama alınmadı. URL / Rules problemi ola bilər.");
    } finally {
      setIsValidating(false);
    }
  }, [cleaned]);

  const enableSensors = useCallback(() => {
    if (!cleaned) return;
    setFirebaseUrl(cleaned);
    setDataSource("firebase");
    localStorage.setItem("agrisense_firebase_url", cleaned);
    setOk(true);
    setErr(null);
  }, [cleaned, setFirebaseUrl, setDataSource]);

  const disableSensors = useCallback(() => {
    setFirebaseUrl("");
    setDataSource("weather");
    localStorage.removeItem("agrisense_firebase_url");
    setOk(false);
    setErr(null);
    setSensorData(null);
    setSensorStatus("idle");
  }, [setFirebaseUrl, setDataSource, setSensorData, setSensorStatus]);

  return (
    <div className="space-y-6">
      <Card className="border-border/50 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Data Sources
          </CardTitle>
          <CardDescription>
            Sensorunuz varsa qoşun. Yoxdursa problem deyil — sistem Weather API
            ilə işləyir.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant={dataSource === "weather" ? "default" : "secondary"}>
              ☁️ Weather API
            </Badge>
            <Badge
              variant={dataSource === "firebase" ? "default" : "secondary"}
            >
              📡 Sensors (Firebase)
            </Badge>

            {connected && (
              <Badge variant="outline" className="gap-1">
                <Link2 className="h-3 w-3" />
                Qoşulub
              </Badge>
            )}

            {sensorStatus === "error" && (
              <Badge variant="destructive">Sensor Error</Badge>
            )}
          </div>

          <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
            <div className="text-sm font-medium">
              Məndə sensor var (optional)
            </div>
            <div className="text-sm text-muted-foreground">
              Firebase Realtime Database URL verin, yoxlama edin və
              aktivləşdirin.
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setOk(false);
                  setErr(null);
                }}
                placeholder="https://agrowise-c3772-default-rtdb.firebaseio.com"
              />

              <Button
                onClick={validate}
                variant="secondary"
                disabled={isValidating || !cleaned}
                className="shrink-0"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Test...
                  </>
                ) : (
                  "Test"
                )}
              </Button>
            </div>

            {err && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {err}
              </div>
            )}

            {ok && (
              <div className="flex items-center gap-2 text-sm text-primary">
                <CheckCircle2 className="h-4 w-4" />
                Uğurlu! Aktivləşdirə bilərsiniz.
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={enableSensors} disabled={!ok}>
                Save & Use Sensors
              </Button>

              <Button
                onClick={disableSensors}
                variant="outline"
                disabled={!connected}
              >
                Disable Sensors
              </Button>
            </div>

            {firebaseUrl && (
              <div className="text-xs text-muted-foreground pt-2 break-all">
                Aktiv URL: {firebaseUrl}
              </div>
            )}

            {sensorError && (
              <div className="text-xs text-destructive pt-1">
                Sensor error: {sensorError}
              </div>
            )}
          </div>

          {dataSource === "firebase" && firebaseUrl && (
            <FirebaseSensorDisplay
              firebaseUrl={firebaseUrl}
              onSensorData={(d) => {
                setSensorData(d); // ✅ store
                setSensorStatus("connected"); // ✅ store
              }}
              onError={(msg) => setSensorStatus("error")}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
