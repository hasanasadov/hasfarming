"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Sprout,
  Search,
  CheckCircle2,
  Droplets,
  Thermometer,
  Timer,
} from "lucide-react";
import type { Crop } from "@/lib/types";
import { crops } from "@/lib/crops-data";

/** ------------------ utils: normalize + fuzzy ------------------ **/
const normalize = (s: string) =>
  (s || "")
    .toLowerCase()
    .trim()
    .replace(/[ə]/g, "e")
    .replace(/[ş]/g, "s")
    .replace(/[ç]/g, "c")
    .replace(/[ğ]/g, "g")
    .replace(/[ı]/g, "i")
    .replace(/[ö]/g, "o")
    .replace(/[ü]/g, "u")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ");

function levenshtein(a: string, b: string) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}

function fuzzyScore(query: string, text: string) {
  // yüksək score = daha yaxşı
  if (!query) return 1000;

  const q = normalize(query);
  const t = normalize(text);

  if (!q) return 1000;
  if (t.includes(q)) return 2000; // exact contains boost

  // token-based yaxınlıq
  const qTokens = q.split(" ").filter(Boolean);
  const tTokens = t.split(" ").filter(Boolean);

  let score = 0;
  for (const qt of qTokens) {
    let best = -999;
    for (const tt of tTokens) {
      if (!tt) continue;
      if (tt.startsWith(qt)) best = Math.max(best, 20);
      const d = levenshtein(qt, tt);
      // 0..2 məsafədə tolerant
      if (d <= 2) best = Math.max(best, 10 - d * 3);
    }
    score += best;
  }

  return score;
}

/** ------------------ component ------------------ **/
interface CropSelectorProps {
  onCropSelect: (crop: Crop) => void;
  selectedCrop: Crop | null;
}

export function CropSelector({
  onCropSelect,
  selectedCrop,
}: CropSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCrops = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return crops;

    const ranked = crops
      .map((crop) => {
        const hay = `${crop.nameAz} ${crop.name}`;
        const score = fuzzyScore(q, hay);
        return { crop, score };
      })
      // minimum threshold — tam boş olmasın deyə
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.crop);

    return ranked;
  }, [searchQuery]);

  const getWaterNeedsLabel = (needs: string) => {
    switch (needs) {
      case "low":
        return "Az";
      case "medium":
        return "Orta";
      case "high":
        return "Çox";
      default:
        return needs;
    }
  };

  const getWaterNeedsBadge = (needs: string) => {
    // Tailwind rəngləri - sənin theme-ə uyğun sakit tonlar
    switch (needs) {
      case "low":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "medium":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
      case "high":
        return "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <Card className="border-border/50 shadow-lg overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <Sprout className="h-5 w-5 text-primary" />
          </span>
          Bitki seçimi
        </CardTitle>
        <CardDescription>
          Əkin etdiyiniz (və ya etmək istədiyiniz) bitkini seçin. Axtarış 1-2
          hərf səhvə tolerantdır.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Məs: pambiq, qarğıdalı, buğda..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11"
          />
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredCrops.map((crop) => {
            const active = selectedCrop?.id === crop.id;

            return (
              <button
                key={crop.id}
                onClick={() => onCropSelect(crop)}
                className={[
                  "group relative p-4 rounded-2xl border text-left transition-all",
                  "hover:shadow-md hover:-translate-y-[1px]",
                  active
                    ? "border-primary/40 bg-primary/10 shadow-sm"
                    : "border-border bg-card hover:border-primary/25",
                ].join(" ")}
              >
                {active && (
                  <CheckCircle2 className="absolute top-3 right-3 h-5 w-5 text-primary" />
                )}

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-3xl block">{crop.icon}</span>
                  </div>
                  <span
                    className={[
                      "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium",
                      getWaterNeedsBadge(crop.waterNeeds),
                    ].join(" ")}
                    title="Su tələbatı"
                  >
                    <Droplets className="h-3.5 w-3.5" />
                    Su: {getWaterNeedsLabel(crop.waterNeeds)}
                  </span>
                </div>

                <h3 className="mt-3 font-semibold text-foreground leading-snug">
                  {crop.nameAz}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {crop.name}
                </p>

                <div className="mt-3 grid md:grid-cols-2 gap-2">
                  <div className="rounded-xl border border-border/60 bg-muted/20 px-2.5 py-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Thermometer className="h-3.5 w-3.5" />
                      Temp
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {crop.optimalTemp.min}–{crop.optimalTemp.max}°C
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-muted/20 px-2.5 py-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Timer className="h-3.5 w-3.5" />
                      Gün
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {crop.growthDays}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {filteredCrops.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            <p className="font-medium text-foreground">
              Heç bir bitki tapılmadı
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Yazılışı bir az fərqli yoxlayın (məs: “pambiq”, “qarğidali”).
            </p>
          </div>
        )}

        {/* Selected details */}
        {selectedCrop && (
          <div className="rounded-2xl border border-primary/20 bg-primary/10 p-5">
            <div className="flex flex-col items-start ">
              <div className="flex gap-4">
                <div className="h-12 w-12 rounded-2xl bg-background/60 ring-1 ring-primary/20 flex items-center justify-center text-3xl">
                  {selectedCrop.icon}
                </div>
                <div className="">
                  <h3 className="font-bold text-foreground text-lg leading-snug">
                    {selectedCrop.nameAz}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedCrop.name}
                  </p>
                </div>
              </div>
              <div className="flex-1 w-full">
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-border/60 bg-card/40 p-3">
                    <p className="text-muted-foreground">Optimal temperatur</p>
                    <p className="font-semibold text-foreground">
                      {selectedCrop.optimalTemp.min}°C –{" "}
                      {selectedCrop.optimalTemp.max}°C
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-card/40 p-3">
                    <p className="text-muted-foreground">Optimal rütubət</p>
                    <p className="font-semibold text-foreground">
                      {selectedCrop.optimalHumidity.min}% –{" "}
                      {selectedCrop.optimalHumidity.max}%
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-card/40 p-3">
                    <p className="text-muted-foreground">pH aralığı</p>
                    <p className="font-semibold text-foreground">
                      {selectedCrop.optimalPh.min} –{" "}
                      {selectedCrop.optimalPh.max}
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-card/40 p-3">
                    <p className="text-muted-foreground">Yetişmə müddəti</p>
                    <p className="font-semibold text-foreground">
                      {selectedCrop.growthDays} gün
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <span
                    className={[
                      "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold",
                      getWaterNeedsBadge(selectedCrop.waterNeeds),
                    ].join(" ")}
                  >
                    <Droplets className="h-4 w-4" />
                    Su tələbatı: {getWaterNeedsLabel(selectedCrop.waterNeeds)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
