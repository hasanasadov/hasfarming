"use client";

import { useMemo, useRef, useState, useCallback, useEffect } from "react";
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
  MapPin,
  Navigation,
  Search,
  Loader2,
  LocateFixed,
  X,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Map as MapIcon,
  CheckCircle2,
  AlertTriangle,
  Copy,
} from "lucide-react";
import type { Location } from "@/lib/types";
import { MapPicker } from "./map-picker";
import { AnimatePresence, motion } from "framer-motion";

interface LocationPickerProps {
  onLocationSelect: (location: Location) => void;
  selectedLocation: Location | null;
}

type SearchResult = { lat: number; lng: number; display_name: string };

function normalizeQuery(q: string) {
  const map: Record<string, string> = {
    ə: "e",
    Ə: "e",
    ı: "i",
    İ: "i",
    ö: "o",
    Ö: "o",
    ü: "u",
    Ü: "u",
    ğ: "g",
    Ğ: "g",
    ş: "s",
    Ş: "s",
    ç: "c",
    Ç: "c",
  };
  return q
    .split("")
    .map((c) => map[c] ?? c)
    .join("")
    .trim();
}

function levenshtein(a: string, b: string) {
  const s = a.toLowerCase();
  const t = b.toLowerCase();
  const m = s.length;
  const n = t.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}

function cx(...x: Array<string | false | null | undefined>) {
  return x.filter(Boolean).join(" ");
}

const MotionSection = ({
  show,
  children,
}: {
  show: boolean;
  children: React.ReactNode;
}) => (
  <AnimatePresence initial={false}>
    {show && (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="overflow-hidden"
      >
        <div className="pt-3">{children}</div>
      </motion.div>
    )}
  </AnimatePresence>
);

export function LocationPicker({
  onLocationSelect,
  selectedLocation,
}: LocationPickerProps) {
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [isResolvingManual, setIsResolvingManual] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);

  const lastSuccessfulResults = useRef<SearchResult[]>([]);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const response = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
      if (response.ok) {
        const data = await response.json();
        return data.address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      }
    } catch {}
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }, []);

  const getLiveLocation = useCallback(async () => {
    setIsGettingLocation(true);
    setError(null);
    setNotice(null);

    if (!navigator.geolocation) {
      setError("Brauzeriniz geolokasiya dəstəkləmir.");
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const address = await reverseGeocode(latitude, longitude);
        onLocationSelect({ lat: latitude, lng: longitude, address });
        setIsGettingLocation(false);
        setNotice("Məkan seçildi.");
      },
      () => {
        setError("Məkanı ala bilmədik. İcazə verdiyinizə əmin olun.");
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }, [onLocationSelect, reverseGeocode]);

  const selectSearchResult = useCallback(
    (result: SearchResult) => {
      onLocationSelect({
        lat: result.lat,
        lng: result.lng,
        address: result.display_name,
      });
      setSearchResults([]);
      setError(null);
      setNotice("Məkan seçildi.");
    },
    [onLocationSelect],
  );

  const handleManualInput = useCallback(async () => {
    setError(null);
    setNotice(null);

    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setError("Düzgün koordinatlar daxil edin.");
      return;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setError("Koordinatlar sərhəddən kənardır.");
      return;
    }

    setIsResolvingManual(true);
    const address = await reverseGeocode(lat, lng);
    onLocationSelect({ lat, lng, address });
    setIsResolvingManual(false);

    setManualLat("");
    setManualLng("");
    setNotice("Məkan seçildi.");
  }, [manualLat, manualLng, onLocationSelect, reverseGeocode]);

  const runSearch = useCallback(async (raw: string) => {
    const q0 = raw.trim();
    if (!q0) return;

    if (q0.length < 2) {
      setSearchResults([]);
      setError("Ən az 2 simvol yazın.");
      return;
    }

    const q = normalizeQuery(q0);

    setIsSearching(true);
    setError(null);
    setNotice(null);
    setSearchResults([]);

    try {
      const viewbox = "44.7,41.95,51.0,38.2";
      const url =
        `https://nominatim.openstreetmap.org/search?format=json` +
        `&q=${encodeURIComponent(q)}` +
        `&limit=8&addressdetails=0&accept-language=az` +
        `&countrycodes=az&bounded=1&viewbox=${encodeURIComponent(viewbox)}`;

      const response = await fetch(url, {
        headers: { "User-Agent": "AgriSense Smart Farming App" },
      });
      if (!response.ok) throw new Error("Axtarış uğursuz oldu.");

      const data = await response.json();
      const mapped: SearchResult[] = (data || []).map(
        (item: { lat: string; lon: string; display_name: string }) => ({
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          display_name: item.display_name,
        }),
      );

      if (mapped.length > 0) {
        setSearchResults(mapped);
        lastSuccessfulResults.current = mapped;
      } else {
        const pool = lastSuccessfulResults.current || [];
        const scored = pool
          .map((r) => ({
            r,
            score: levenshtein(
              normalizeQuery(r.display_name).slice(0, 40),
              q.slice(0, 40),
            ),
          }))
          .sort((a, b) => a.score - b.score)
          .slice(0, 5)
          .map((x) => x.r);

        if (scored.length > 0) {
          setSearchResults(scored);
          setNotice("Tam uyğun nəticə tapılmadı — oxşar yerlər göstərildi.");
        } else {
          setError("Heç bir nəticə tapılmadı.");
        }
      }
    } catch {
      setError("Axtarış zamanı xəta baş verdi.");
    } finally {
      setIsSearching(false);
    }
  }, []);

  // debounce auto-search
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setError(null);
      return;
    }

    const id = window.setTimeout(() => runSearch(q), 450);
    return () => window.clearTimeout(id);
  }, [searchQuery, runSearch]);

  const resultsTitle = useMemo(() => {
    if (isSearching) return "Axtarılır…";
    if (searchResults.length > 0) return "Nəticələr";
    return null;
  }, [isSearching, searchResults.length]);

  const copyCoords = useCallback(async () => {
    if (!selectedLocation) return;
    const text = `${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}`;
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Koordinatlar kopyalandı.");
      setError(null);
    } catch {
      setNotice(null);
      setError("Kopyalama mümkün olmadı.");
    }
  }, [selectedLocation]);

  return (
    <Card className="relative overflow-hidden border-border/60 bg-background/60 backdrop-blur">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-muted/40 via-background to-background" />

      <CardHeader className="relative pb-4">
        <CardTitle className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-muted/40">
            <MapPin className="h-4 w-4" />
          </span>
          Məkan seçimi
        </CardTitle>
        <CardDescription>
          Canlı məkan götür, ünvanla axtar, xəritədən seç və ya koordinat daxil
          et.
        </CardDescription>
      </CardHeader>

      <CardContent className="relative space-y-5">
        {/* Selected summary (top) */}
        {selectedLocation && (
          <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge className="rounded-full" variant="secondary">
                    Seçildi
                  </Badge>
                  <div className="text-sm font-semibold text-foreground truncate">
                    {selectedLocation.address || "Seçilmiş məkan"}
                  </div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {selectedLocation.lat.toFixed(6)},{" "}
                  {selectedLocation.lng.toFixed(6)}
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="rounded-xl shrink-0"
                onClick={copyCoords}
                title="Koordinatları kopyala"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Live Location */}
        <div className="rounded-2xl border bg-background/60 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                Canlı məkan
              </p>
              <p className="text-xs text-muted-foreground">
                GPS ilə dəqiq məkanınız götürüləcək.
              </p>
            </div>

            <Button
              onClick={getLiveLocation}
              disabled={isGettingLocation}
              className="gap-2 rounded-xl"
            >
              {isGettingLocation ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LocateFixed className="h-4 w-4" />
              )}
              Canlı məkanımı istifadə et
            </Button>
          </div>
        </div>

        {/* Advanced toggle */}
        <button
          type="button"
          onClick={() => setIsAdvancedOpen((s) => !s)}
          className={cx(
            "w-full rounded-2xl border bg-background/60 px-4 py-3",
            "hover:bg-muted/30 transition-colors",
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-muted/30">
                <SlidersHorizontal className="h-4 w-4" />
              </span>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">
                  Axtarış / Koordinat
                </p>
                <p className="text-xs text-muted-foreground">
                  Ünvan axtar və ya əl ilə daxil et
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="rounded-full">
                {isAdvancedOpen ? "Açıq" : "Bağlı"}
              </Badge>
              {isAdvancedOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </button>

        <MotionSection show={isAdvancedOpen}>
          <div className="space-y-5">
            {/* Search */}
            <div className="rounded-2xl border bg-background/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Axtarış
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Məs: Bakı, Sumqayıt, park, kənd…
                  </p>
                </div>
                <Badge className="rounded-full" variant="secondary">
                  AZ bias
                </Badge>
              </div>

              <div className="mt-3 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Axtarın…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && runSearch(searchQuery)
                    }
                    className="pl-9 rounded-xl"
                  />
                </div>

                {searchQuery.trim().length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSearchQuery("");
                      setSearchResults([]);
                      setError(null);
                      setNotice(null);
                    }}
                    className="rounded-xl px-3"
                    title="Təmizlə"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}

                <Button
                  type="button"
                  onClick={() => runSearch(searchQuery)}
                  disabled={isSearching}
                  variant="secondary"
                  className="gap-2 rounded-xl"
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Axtar
                </Button>
              </div>

              <div className="mt-3 rounded-2xl border bg-card/40 overflow-hidden">
                {resultsTitle && (
                  <div className="px-4 py-2 text-xs text-muted-foreground border-b border-border/70">
                    {resultsTitle}
                  </div>
                )}

                <div className="max-h-60 overflow-auto">
                  {searchResults.map((r, idx) => (
                    <button
                      key={`${r.lat}-${r.lng}-${idx}`}
                      onClick={() => selectSearchResult(r)}
                      className="w-full text-left px-4 py-3 hover:bg-muted/60 transition-colors border-b border-border last:border-b-0"
                    >
                      <p className="text-sm text-foreground line-clamp-2">
                        {r.display_name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {r.lat.toFixed(5)}, {r.lng.toFixed(5)}
                      </p>
                    </button>
                  ))}

                  {searchResults.length === 0 && !isSearching && (
                    <div className="px-4 py-3 text-sm text-muted-foreground">
                      Yazmağa başlayın (ən az 2 simvol).
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Manual coords */}
            <div className="rounded-2xl border bg-background/60 p-4">
              <p className="text-sm font-semibold text-foreground">
                Koordinatla seçim
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Enlik (lat) və uzunluq (lng) daxil edin.
              </p>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
                <Input
                  placeholder="Enlik (lat)"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  type="number"
                  step="any"
                  className="rounded-xl"
                />
                <Input
                  placeholder="Uzunluq (lng)"
                  value={manualLng}
                  onChange={(e) => setManualLng(e.target.value)}
                  type="number"
                  step="any"
                  className="rounded-xl"
                />
                <Button
                  type="button"
                  onClick={handleManualInput}
                  disabled={isResolvingManual}
                  variant="secondary"
                  className="gap-2 rounded-xl"
                >
                  {isResolvingManual ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Navigation className="h-4 w-4" />
                  )}
                  Tətbiq et
                </Button>
              </div>
            </div>
          </div>
        </MotionSection>

        {/* Map toggle */}
        <button
          type="button"
          onClick={() => setIsMapOpen((s) => !s)}
          className={cx(
            "w-full rounded-2xl border bg-background/60 px-4 py-3",
            "hover:bg-muted/30 transition-colors",
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-muted/30">
                <MapIcon className="h-4 w-4" />
              </span>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">
                  Xəritə ilə seçim
                </p>
                <p className="text-xs text-muted-foreground">
                  Xəritədə pin qoyaraq dəqiqləşdir
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="rounded-full">
                {isMapOpen ? "Açıq" : "Bağlı"}
              </Badge>
              {isMapOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </button>

        <MotionSection show={isMapOpen}>
          <div className="rounded-2xl border bg-background/60 ">
            <MapPicker
              onLocationSelect={onLocationSelect}
              selectedLocation={selectedLocation}
            />
          </div>
        </MotionSection>

        {/* Notices / Errors (soft) */}
        <AnimatePresence initial={false}>
          {notice && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.18 }}
              className="rounded-2xl border border-primary/15 bg-primary/5 p-3"
            >
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary" />
                <p className="text-sm text-foreground">{notice}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.18 }}
              className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-700 dark:text-amber-300" />
                <p className="text-sm text-foreground">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
