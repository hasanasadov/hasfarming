"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sprout,
  Search,
  CheckCircle2,
  Droplets,
  Thermometer,
  Timer,
  X,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import type { Crop } from "@/lib/types";
import { crops } from "@/lib/crops-data";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "@/lib/i18n";

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
  if (!query) return 1000;

  const q = normalize(query);
  const t = normalize(text);

  if (!q) return 1000;
  if (t.includes(q)) return 2500;

  const qTokens = q.split(" ").filter(Boolean);
  const tTokens = t.split(" ").filter(Boolean);

  let score = 0;
  for (const qt of qTokens) {
    let best = -999;
    for (const tt of tTokens) {
      if (!tt) continue;

      if (tt === qt) best = Math.max(best, 28);
      if (tt.startsWith(qt)) best = Math.max(best, 20);

      const d = levenshtein(qt, tt);
      if (d <= 2) best = Math.max(best, 10 - d * 3);
    }
    score += best;
  }

  return score;
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

/** ------------------ component ------------------ **/
interface CropSelectorProps {
  onCropSelect: (crop: Crop) => void;
  selectedCrop: Crop | null;
}

export function CropSelector({ onCropSelect, selectedCrop }: CropSelectorProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showDetails, setShowDetails] = useState(true);
  const detailsRef = useRef<HTMLDivElement | null>(null);

  const filteredCrops = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return crops;

    const ranked = crops
      .map((crop) => {
        const hay = `${crop.nameAz} ${crop.name}`;
        const score = fuzzyScore(q, hay);
        return { crop, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.crop);

    return ranked;
  }, [searchQuery]);

  useEffect(() => {
    if (selectedCrop) setShowDetails(true);
  }, [selectedCrop]);

  useEffect(() => {
    if (selectedCrop && showDetails && detailsRef.current) {
      detailsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedCrop, showDetails]);

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
    switch (needs) {
      case "low":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20";
      case "medium":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20";
      case "high":
        return "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const quickStats = useMemo(() => {
    if (!selectedCrop) return null;
    return {
      water: getWaterNeedsLabel(selectedCrop.waterNeeds),
      temp: `${selectedCrop.optimalTemp.min}–${selectedCrop.optimalTemp.max}°C`,
      days: `${selectedCrop.growthDays} gün`,
    };
  }, [selectedCrop]);

  const clearSearch = useCallback(() => setSearchQuery(""), []);

  return (
    <Card className="relative overflow-hidden border-border/60 bg-background/60 backdrop-blur">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-muted/40 via-background to-background" />

      <CardHeader className="relative pb-4">
        <CardTitle className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-muted/40">
            <Sprout className="h-4 w-4" />
          </span>
          {t("crop.title")}
        </CardTitle>
        <CardDescription>
          {t("crop.desc")}
        </CardDescription>

        {/* Selected mini summary (no “tort” on mobile) */}
        {selectedCrop && quickStats && (
          <div className="mt-3 flex items-center gap-2 overflow-x-auto whitespace-nowrap pr-1 no-scrollbar">
            <Badge variant="secondary" className="rounded-full h-7 px-3 shrink-0">
              {t("crop.selected")} <span className="ml-1 font-semibold">{selectedCrop.nameAz}</span>
            </Badge>
            <Badge
              variant="secondary"
              className={cx("rounded-full h-7 px-3 shrink-0", getWaterNeedsBadge(selectedCrop.waterNeeds))}
            >
              <Droplets className="h-3.5 w-3.5 mr-1" />
              Su: {quickStats.water}
            </Badge>
            <Badge variant="secondary" className="rounded-full h-7 px-3 shrink-0">
              <Thermometer className="h-3.5 w-3.5 mr-1" />
              {quickStats.temp}
            </Badge>
            <Badge variant="secondary" className="rounded-full h-7 px-3 shrink-0">
              <Timer className="h-3.5 w-3.5 mr-1" />
              {quickStats.days}
            </Badge>
          </div>
        )}
      </CardHeader>

      <CardContent className="relative space-y-5">
        {/* Search */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("crop.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-11 rounded-xl"
            />
          </div>

          <div className="flex gap-2">
            {searchQuery.trim() && (
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={clearSearch}
                title="Təmizlə"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <Badge variant="secondary" className="rounded-full h-11 px-4 hidden sm:inline-flex">
              {filteredCrops.length} nəticə
            </Badge>
          </div>
        </div>

        {/* Grid (more “elite”: less clutter, better spacing, focus ring) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredCrops.map((crop) => {
            const active = selectedCrop?.id === crop.id;

            return (
              <button
                key={crop.id}
                onClick={() => onCropSelect(crop)}
                className={cx(
                  "group relative rounded-2xl border p-4 text-left",
                  "bg-background/60 transition-all",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  "hover:-translate-y-[1px] hover:shadow-md",
                  active
                    ? "border-primary/30 bg-primary/5 shadow-sm"
                    : "border-border/60 hover:border-primary/15",
                )}
              >
                {active && (
                  <CheckCircle2 className="absolute right-3 top-3 h-5 w-5 text-primary" />
                )}

                <div className="flex items-start justify-between gap-3">
                  <span className="text-3xl leading-none">{crop.icon}</span>

                  <span
                    className={cx(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium",
                      getWaterNeedsBadge(crop.waterNeeds),
                    )}
                    title="Su tələbatı"
                  >
                    <Droplets className="h-3.5 w-3.5" />
                    {getWaterNeedsLabel(crop.waterNeeds)}
                  </span>
                </div>

                <h3 className="mt-3 font-semibold text-foreground leading-snug">
                  {crop.nameAz}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {crop.name}
                </p>

                <div className="mt-3 grid gap-2">
                  <div className="rounded-xl border border-border/60 bg-muted/20 px-2.5 py-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Thermometer className="h-3.5 w-3.5" />
                      {t("crop.optimalTemp")}
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {crop.optimalTemp.min}–{crop.optimalTemp.max}°C
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-muted/20 px-2.5 py-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Timer className="h-3.5 w-3.5" />
                      Yetişmə
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {crop.growthDays} gün
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {filteredCrops.length === 0 && (
          <div className="rounded-2xl border bg-background/60 p-6 text-center">
            <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-muted/30">
              <Info className="h-4 w-4" />
            </div>
            <p className="mt-3 font-semibold text-foreground">
              {t("crop.noResult")}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Yazılışı fərqli yoxlayın (məs: “pambiq”, “qarğidali”).
            </p>
          </div>
        )}

        {/* Selected details (collapsible + smooth) */}
        {selectedCrop && (
          <div ref={detailsRef} className="rounded-2xl border border-primary/15 bg-primary/5 p-4 sm:p-5">
            <button
              type="button"
              onClick={() => setShowDetails((s) => !s)}
              className="w-full flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-11 w-11 rounded-2xl border bg-background/60 flex items-center justify-center text-2xl">
                  {selectedCrop.icon}
                </div>
                <div className="min-w-0 text-left">
                  <div className="font-semibold text-foreground truncate">
                    {selectedCrop.nameAz}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {selectedCrop.name}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Badge
                  variant="secondary"
                  className={cx("rounded-full", getWaterNeedsBadge(selectedCrop.waterNeeds))}
                >
                  <Droplets className="h-3.5 w-3.5 mr-1" />
                  {getWaterNeedsLabel(selectedCrop.waterNeeds)}
                </Badge>

                {showDetails ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </button>

            <MotionSection show={showDetails}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-border/60 bg-background/60 p-3">
                  <p className="text-muted-foreground">{t("crop.optimalTemperature")}</p>
                  <p className="font-semibold text-foreground">
                    {selectedCrop.optimalTemp.min}°C – {selectedCrop.optimalTemp.max}°C
                  </p>
                </div>

                <div className="rounded-xl border border-border/60 bg-background/60 p-3">
                  <p className="text-muted-foreground">{t("crop.optimalHumidity")}</p>
                  <p className="font-semibold text-foreground">
                    {selectedCrop.optimalHumidity.min}% – {selectedCrop.optimalHumidity.max}%
                  </p>
                </div>

                <div className="rounded-xl border border-border/60 bg-background/60 p-3">
                  <p className="text-muted-foreground">pH aralığı</p>
                  <p className="font-semibold text-foreground">
                    {selectedCrop.optimalPh.min} – {selectedCrop.optimalPh.max}
                  </p>
                </div>

                <div className="rounded-xl border border-border/60 bg-background/60 p-3">
                  <p className="text-muted-foreground">Yetişmə müddəti</p>
                  <p className="font-semibold text-foreground">
                    {selectedCrop.growthDays} gün
                  </p>
                </div>
              </div>
            </MotionSection>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
