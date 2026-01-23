// components/data-source-selector.tsx
"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Cloud,
  Database,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import type { DataSource } from "@/lib/types";

interface DataSourceSelectorProps {
  onSourceSelect: (source: DataSource, firebaseUrl?: string) => void;
  selectedSource: DataSource | null;
}

function normalizeFirebaseUrl(raw: string) {
  let url = raw.trim();
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
  url = url.replace(/\.json$/i, "");
  url = url.replace(/\/+$/g, "");
  return url;
}

export function DataSourceSelector({
  onSourceSelect,
  selectedSource,
}: DataSourceSelectorProps) {
  const [firebaseUrl, setFirebaseUrl] = useState("");
  const normalizedUrl = useMemo(
    () => normalizeFirebaseUrl(firebaseUrl),
    [firebaseUrl],
  );

  const [firebaseOpen, setFirebaseOpen] = useState(false);

  const [isValidating, setIsValidating] = useState(false);
  const [isFirebaseValid, setIsFirebaseValid] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateFirebaseUrl = async () => {
    if (!normalizedUrl) {
      setValidationError("Firebase URL daxil edin");
      setIsFirebaseValid(false);
      return;
    }

    setIsValidating(true);
    setValidationError(null);
    setIsFirebaseValid(false);

    try {
      const res = await fetch(
        `/api/firebase/validate?url=${encodeURIComponent(normalizedUrl)}`,
        { method: "GET" },
      );

      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.ok) {
        setIsFirebaseValid(true);
        setValidationError(null);
      } else {
        setIsFirebaseValid(false);
        setValidationError(data?.error || "Firebase yoxlanıla bilmədi");
      }
    } catch (e) {
      console.error("validateFirebaseUrl error:", e);
      setIsFirebaseValid(false);
      setValidationError("Yoxlama zamanı xəta baş verdi (network).");
    } finally {
      setIsValidating(false);
    }
  };

  const proceedWeather = () => {
    onSourceSelect("weather");
  };

  const proceedFirebase = () => {
    if (!isFirebaseValid || !normalizedUrl) return;
    onSourceSelect("firebase", normalizedUrl);
  };

  return (
    <Card className="border-border/50 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Database className="h-5 w-5 text-primary" />
          Data Mənbəyi Seçimi
        </CardTitle>
        <CardDescription>
          Default olaraq hava məlumatları ilə işləyir. İstəsəniz sensorlar üçün
          Firebase qoşa bilərsiniz.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* WEATHER (default path) */}
        <div className="p-4 rounded-xl border border-border bg-card">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Cloud className="h-6 w-6 text-primary" />
            </div>

            <div className="flex-1">
              <h3 className="font-semibold text-foreground">
                Hava API-si (Tövsiyə olunur)
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Seçilmiş məkana görə hava məlumatlarını alırıq və torpaq
                şəraitini təxmin edirik. Heç bir əlavə quraşdırma yoxdur.
              </p>

              <div className="flex flex-wrap gap-2 mt-3">
                <span className="px-2 py-1 rounded-full bg-secondary text-secondary-foreground text-xs">
                  Pulsuz
                </span>
                <span className="px-2 py-1 rounded-full bg-secondary text-secondary-foreground text-xs">
                  Ani
                </span>
                <span className="px-2 py-1 rounded-full bg-secondary text-secondary-foreground text-xs">
                  7 günlük proqnoz
                </span>
              </div>

              <div className="mt-4">
                <Button onClick={proceedWeather} className="gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Davam et (Hava API)
                </Button>
              </div>
            </div>

            {selectedSource === "weather" && (
              <CheckCircle2 className="h-5 w-5 text-primary" />
            )}
          </div>
        </div>

        {/* FIREBASE (optional accordion) */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between p-4 hover:bg-muted/20 transition-colors"
            onClick={() => setFirebaseOpen((p) => !p)}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-accent/50">
                <Database className="h-5 w-5 text-accent-foreground" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">
                  Firebase Sensorları (Optional)
                </p>
                <p className="text-xs text-muted-foreground">
                  IoT sensor datası varsa qoş, yoxdursa heç lazım deyil.
                </p>
              </div>
            </div>

            <ChevronDown
              className={`h-5 w-5 transition-transform ${firebaseOpen ? "rotate-180" : ""}`}
            />
          </button>

          {firebaseOpen && (
            <div className="p-4 border-t border-border space-y-3">
              <div className="space-y-2">
                <Label htmlFor="firebase-url" className="text-foreground">
                  Firebase Database URL
                </Label>

                <div className="flex gap-2">
                  <Input
                    id="firebase-url"
                    placeholder="https://your-project.firebaseio.com/sensors"
                    value={firebaseUrl}
                    onChange={(e) => {
                      setFirebaseUrl(e.target.value);
                      setIsFirebaseValid(false);
                      setValidationError(null);
                    }}
                    className="flex-1"
                  />

                  <Button
                    onClick={validateFirebaseUrl}
                    disabled={isValidating}
                    variant="secondary"
                  >
                    {isValidating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Yoxla"
                    )}
                  </Button>
                </div>

                {firebaseUrl.trim().length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Normalized:{" "}
                    <span className="font-medium text-foreground">
                      {normalizedUrl}
                    </span>
                  </p>
                )}
              </div>

              {validationError && (
                <div className="flex items-start gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 mt-0.5" />
                  <span>{validationError}</span>
                </div>
              )}

              {isFirebaseValid && (
                <div className="flex items-center gap-2 text-primary text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  Firebase bağlantısı uğurlu!
                </div>
              )}

              <Button
                onClick={proceedFirebase}
                disabled={!isFirebaseValid}
                className="w-full"
              >
                Davam et (Firebase)
              </Button>

              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground">
                  <strong>Qeyd:</strong> Sensor datası aşağıdakı formatda ola
                  bilər:{" "}
                  <code className="px-1 py-0.5 rounded bg-muted text-foreground">
                    {
                      "{ soilMoisture, soilTemperature, airTemperature, humidity, ph, nitrogen, phosphorus, potassium }"
                    }
                  </code>
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
