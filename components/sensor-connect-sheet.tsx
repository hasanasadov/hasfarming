"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Loader2,
  Plug,
  Unplug,
} from "lucide-react";

type ValidateResult =
  | { ok: true; normalizedUrl: string; sample?: any }
  | { ok: false; error: string };

function normalizeFirebaseBaseUrl(raw: string) {
  let url = (raw || "").trim();
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  url = url.replace(/\.json$/i, "");
  url = url.replace(/\/+$/g, "");
  return url;
}

interface SensorConnectSheetProps {
  initialUrl?: string;
  onConnect: (firebaseBaseUrl: string) => void;
  onDisconnect: () => void;
  isConnected: boolean;
}

export function SensorConnectSheet({
  initialUrl,
  onConnect,
  onDisconnect,
  isConnected,
}: SensorConnectSheetProps) {
  const [open, setOpen] = useState(false);
  const [firebaseUrl, setFirebaseUrl] = useState(initialUrl || "");
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [normalized, setNormalized] = useState<string>("");

  const canValidate = useMemo(
    () => firebaseUrl.trim().length > 5,
    [firebaseUrl],
  );

  useEffect(() => {
    // açanda state sync olsun
    if (open) {
      setFirebaseUrl(initialUrl || "");
      setIsValid(false);
      setError(null);
      setNormalized("");
    }
  }, [open, initialUrl]);

  const validate = async () => {
    const base = normalizeFirebaseBaseUrl(firebaseUrl);
    if (!base) {
      setError("Firebase URL daxil edin");
      setIsValid(false);
      return;
    }

    // simple sanity
    if (
      !base.includes("firebaseio.com") &&
      !base.includes("firebasedatabase.app")
    ) {
      setError("Düzgün Firebase Realtime Database URL daxil edin");
      setIsValid(false);
      return;
    }

    setIsValidating(true);
    setError(null);
    setIsValid(false);
    setNormalized("");

    try {
      const res = await fetch(
        `/api/firebase/validate?url=${encodeURIComponent(base)}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const data = (await res.json().catch(() => ({}))) as ValidateResult;

      if (!res.ok || !data || (data as any).ok === false) {
        const msg =
          (data as any)?.error ||
          "Yoxlama alınmadı. URL, rules (permission), və ya network problemi ola bilər.";
        throw new Error(msg);
      }

      const norm = (data as any).normalizedUrl || base;
      setNormalized(norm);
      setIsValid(true);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Firebase URL yoxlanıla bilmədi");
      setIsValid(false);
    } finally {
      setIsValidating(false);
    }
  };

  const connect = () => {
    const base = normalized || normalizeFirebaseBaseUrl(firebaseUrl);
    if (!base) return;
    onConnect(base);
    setOpen(false);
  };

  const disconnect = () => {
    onDisconnect();
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant={isConnected ? "secondary" : "default"}
          className="w-full justify-start gap-2"
        >
          <Database className="h-4 w-4" />
          Sensorum var
          {isConnected && (
            <Badge variant="secondary" className="ml-auto">
              Qoşulu
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      {/* ✅ Radix warning fix: SheetContent daxilində SheetTitle mütləq olmalıdır */}
      <SheetContent side="right" className="w-[380px] sm:w-[420px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Sensor qoşulması
          </SheetTitle>
          <SheetDescription>
            Firebase Realtime Database URL daxil et, yoxla və sonra qoş.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fburl">Firebase DB URL</Label>
            <Input
              id="fburl"
              placeholder="https://your-project.firebaseio.com"
              value={firebaseUrl}
              onChange={(e) => {
                setFirebaseUrl(e.target.value);
                setIsValid(false);
                setError(null);
                setNormalized("");
              }}
            />
            <p className="text-xs text-muted-foreground">
              Nümunə:{" "}
              <code className="px-1 py-0.5 rounded bg-muted">
                https://xxx-default-rtdb.firebaseio.com
              </code>
            </p>
          </div>

          {error && (
            <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
              <div className="text-destructive">{error}</div>
            </div>
          )}

          {isValid && (
            <div className="flex gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
              <div className="text-foreground">
                URL uğurlu yoxlandı
                {normalized && (
                  <div className="mt-1 text-xs text-muted-foreground break-all">
                    Normalized: {normalized}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={validate}
              disabled={!canValidate || isValidating}
              className="flex-1 gap-2"
            >
              {isValidating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Yoxla
            </Button>

            {!isConnected ? (
              <Button
                type="button"
                onClick={connect}
                disabled={!isValid}
                className="flex-1 gap-2"
              >
                <Plug className="h-4 w-4" />
                Qoş
              </Button>
            ) : (
              <Button
                type="button"
                variant="destructive"
                onClick={disconnect}
                className="flex-1 gap-2"
              >
                <Unplug className="h-4 w-4" />
                Ayır
              </Button>
            )}
          </div>

          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">
              <strong>Qeyd:</strong> Əgər “permission denied” çıxsa, Firebase
              rules private-dir. Onda ya read icazəsi verilməlidir, ya da
              tokenlə işləməliyik.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
