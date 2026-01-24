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
} from "lucide-react";
import type { Location } from "@/lib/types";
import { MapPicker } from "./map-picker";

interface LocationPickerProps {
  onLocationSelect: (location: Location) => void;
  selectedLocation: Location | null;
}

type SearchResult = { lat: number; lng: number; display_name: string };

function normalizeQuery(q: string) {
  // AZ/TR yazılarını “axtarış üçün” daha stabil edir
  // (Nominatim bəzən “ş/ə/ğ/ı” ilə qəribə davranır)
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

// çox yüngül “fuzzy” (display_name daxilində oxşarlıq)
// Nominatim 0 nəticə verəndə ən azı əvvəlki nəticələrdən kömək edir
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

  // ✅ yeni: axtarış / manual bölməsi açılıb-bağlansın
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);

  // ✅ son “uğurlu” nəticələri saxla (fuzzy fallback üçün)
  const lastSuccessfulResults = useRef<SearchResult[]>([]);

  const reverseGeocode = useCallback(
    async (lat: number, lng: number): Promise<string> => {
      try {
        const response = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
        if (response.ok) {
          const data = await response.json();
          return data.address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        }
      } catch (e) {
        console.error("Reverse geocoding error:", e);
      }
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    },
    [],
  );

  const getLiveLocation = useCallback(async () => {
    setIsGettingLocation(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Brauzeriniz geolokasiya dəstəkləmir");
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const address = await reverseGeocode(latitude, longitude);
        onLocationSelect({ lat: latitude, lng: longitude, address });
        setIsGettingLocation(false);
      },
      (err) => {
        console.error("Geolocation error:", err);
        setError("Məkan əldə edilə bilmədi. Zəhmət olmasa icazə verin.");
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
    },
    [onLocationSelect],
  );

  const handleManualInput = useCallback(async () => {
    setError(null);

    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setError("Düzgün koordinatlar daxil edin");
      return;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setError("Koordinatlar sərhəddən kənardır");
      return;
    }

    setIsResolvingManual(true);
    const address = await reverseGeocode(lat, lng);
    onLocationSelect({ lat, lng, address });
    setIsResolvingManual(false);

    setManualLat("");
    setManualLng("");
  }, [manualLat, manualLng, onLocationSelect, reverseGeocode]);

  const runSearch = useCallback(async (raw: string) => {
    const q0 = raw.trim();
    if (!q0) return;

    // çox qısa query = spam kimi olur
    if (q0.length < 2) {
      setSearchResults([]);
      setError("Ən az 2 simvol yazın");
      return;
    }

    const q = normalizeQuery(q0);

    setIsSearching(true);
    setError(null);
    setSearchResults([]);

    try {
      // ✅ Azerbaijan bias: viewbox + bounded=1 + countrycodes=az
      // viewbox: (lng_left, lat_top, lng_right, lat_bottom)
      const viewbox = "44.7,41.95,51.0,38.2"; // AZ roughly
      const url =
        `https://nominatim.openstreetmap.org/search?format=json` +
        `&q=${encodeURIComponent(q)}` +
        `&limit=8&addressdetails=0&accept-language=az` +
        `&countrycodes=az&bounded=1&viewbox=${encodeURIComponent(viewbox)}`;

      const response = await fetch(url, {
        headers: { "User-Agent": "AgriSense Smart Farming App" },
      });

      if (!response.ok) throw new Error("Axtarış uğursuz oldu");

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
        setError(null);
      } else {
        // ✅ fallback: son nəticələrdən fuzzy filter
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
          setError("Tam uyğun nəticə tapılmadı — oxşar yerlər göstərildi.");
        } else {
          setError("Heç bir nəticə tapılmadı");
        }
      }
    } catch (e) {
      console.error("Search error:", e);
      setError("Axtarış zamanı xəta baş verdi");
    } finally {
      setIsSearching(false);
    }
  }, []);

  // ✅ debounce auto-search
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setError(null);
      return;
    }

    const id = window.setTimeout(() => {
      runSearch(q);
    }, 450);

    return () => window.clearTimeout(id);
  }, [searchQuery, runSearch]);

  const resultsTitle = useMemo(() => {
    if (isSearching) return "Axtarılır...";
    if (searchResults.length > 0) return "Nəticələr";
    return null;
  }, [isSearching, searchResults.length]);

  return (
    <Card className="border-border/50 shadow-lg overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <MapPin className="h-5 w-5 text-primary" />
          </span>
          Məkan seçimi
        </CardTitle>
        <CardDescription>
          Canlı məkan seçin, axtarın və ya koordinatla daxil edin.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Live Location */}
        <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Canlı məkan</p>
              <p className="text-xs text-muted-foreground">
                GPS ilə dəqiq məkanınız götürüləcək.
              </p>
            </div>
            <Button
              onClick={getLiveLocation}
              disabled={isGettingLocation}
              className="gap-2"
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

        {/* Advanced (Search + Manual) Toggle */}
        <button
          type="button"
          onClick={() => setIsAdvancedOpen((s) => !s)}
          className="w-full rounded-xl border border-border/60 bg-card hover:bg-muted/30 transition-colors px-4 py-3 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">
                Axtarış / Əl ilə daxil et
              </p>
              <p className="text-xs text-muted-foreground">
                Ünvan axtarın və ya koordinat yazın
              </p>
            </div>
          </div>
          {isAdvancedOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {isAdvancedOpen && (
          <div className="space-y-6">
            {/* Search */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Axtarış</p>

              <div className="flex gap-2">
                <Input
                  placeholder="Məs: Bakı, X parkı, Sumqayıt..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runSearch(searchQuery)}
                  className="flex-1"
                />

                {searchQuery.trim().length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSearchQuery("");
                      setSearchResults([]);
                      setError(null);
                    }}
                    className="px-3"
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
                  className="gap-2"
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Axtar
                </Button>
              </div>

              {(resultsTitle || searchResults.length > 0) && (
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  {resultsTitle && (
                    <div className="px-4 py-2 text-xs text-muted-foreground border-b border-border/70">
                      {resultsTitle}
                    </div>
                  )}
                  <div className="max-h-56 overflow-auto">
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
              )}
            </div>

            {/* Manual */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                Koordinatla seçim
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
                <Input
                  placeholder="Enlik (lat)"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  type="number"
                  step="any"
                />
                <Input
                  placeholder="Uzunluq (lng)"
                  value={manualLng}
                  onChange={(e) => setManualLng(e.target.value)}
                  type="number"
                  step="any"
                />
                <Button
                  type="button"
                  onClick={handleManualInput}
                  disabled={isResolvingManual}
                  variant="secondary"
                  className="gap-2"
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
        )}

        {/* Advanced Content */}
        <button
          type="button"
          onClick={() => setIsMapOpen((s) => !s)}
          className="w-full rounded-xl border border-border/60 bg-card hover:bg-muted/30 transition-colors px-4 py-3 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">
                Xəritə ilə seçim
              </p>
            </div>
          </div>
          {isMapOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {isMapOpen && (
          <MapPicker
            onLocationSelect={onLocationSelect}
            selectedLocation={selectedLocation}
          />
        )}
        {/* Error */}
        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Selected */}
        {selectedLocation && (
          <div className="rounded-xl border border-primary/20 bg-primary/10 p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-background/60 ring-1 ring-primary/20">
                <MapPin className="h-5 w-5 text-primary" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-foreground leading-snug">
                  {selectedLocation.address || "Seçilmiş məkan"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedLocation.lat.toFixed(6)},{" "}
                  {selectedLocation.lng.toFixed(6)}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
