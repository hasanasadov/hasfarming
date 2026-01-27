"use client";

import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Droplets,
  Leaf,
  AlertTriangle,
  Info,
  Sparkles,
  CheckCircle2,
  Clock,
} from "lucide-react";
import type {
  Crop,
  WeatherData,
  FirebaseSensorData,
  Recommendation,
} from "@/lib/types";

interface RecommendationsProps {
  crop: Crop;
  weather?: WeatherData;
  sensorData?: FirebaseSensorData;
  forecast?: WeatherData[];
  dayIndex?: number;
}

const wrap: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut", staggerChildren: 0.05 },
  },
};

const row: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
  exit: { opacity: 0, y: 8, transition: { duration: 0.18 } },
};

export function Recommendations({
  crop,
  weather,
  sensorData,
  forecast = [],
  dayIndex = 0,
}: RecommendationsProps) {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    setLastUpdate(new Date());
  }, [weather, sensorData, forecast, crop, dayIndex]);

  const day = forecast[dayIndex];

  const recommendations = useMemo(() => {
    const recs: Recommendation[] = [];
    const isToday = dayIndex === 0;

    const temp = isToday
      ? (sensorData?.airTemperature ?? weather?.temp ?? day?.temp ?? 20)
      : (day?.temp ?? 20);

    const soilMoisture = isToday
      ? (sensorData?.soilMoisture ??
        weather?.soilMoisture ??
        day?.soilMoisture ??
        50)
      : (day?.soilMoisture ?? 50);

    const precipitation = day?.precipitation ?? 0;
    const ph = isToday ? sensorData?.ph : undefined;

    // Temperature
    if (temp < crop.optimalTemp.min) {
      const diff = crop.optimalTemp.min - temp;
      recs.push({
        type: "warning",
        title: "Temperatur aşağıdır",
        description: `${dayIndex === 0 ? "Bu gün" : "Seçilmiş gün"} temperatur (${temp.toFixed(
          1,
        )}°C) ${crop.nameAz} üçün optimal aralıqdan ${diff.toFixed(
          1,
        )}°C aşağıdır. Örtük/istixana tədbiri planlaya bilərsiniz.`,
        priority: diff > 5 ? "critical" : "high",
      });
    } else if (temp > crop.optimalTemp.max) {
      const diff = temp - crop.optimalTemp.max;
      recs.push({
        type: "warning",
        title: "Temperatur yüksəkdir",
        description: `${dayIndex === 0 ? "Bu gün" : "Seçilmiş gün"} temperatur (${temp.toFixed(
          1,
        )}°C) ${crop.nameAz} üçün optimal aralıqdan ${diff.toFixed(
          1,
        )}°C yuxarıdır. Kölgə + suvarma intervalını optimallaşdırın.`,
        priority: diff > 5 ? "critical" : "high",
      });
    } else {
      recs.push({
        type: "info",
        title: "Temperatur uyğundur",
        description: `Temperatur (${temp.toFixed(1)}°C) ${crop.nameAz} üçün yaxşı aralıqdadır.`,
        priority: "low",
      });
    }

    // Soil moisture
    if (soilMoisture < 30) {
      recs.push({
        type: "irrigation",
        title: "Suvarmanı prioritetləşdirək",
        description: `Torpaq nəmliyi aşağıdır (${soilMoisture.toFixed(
          0,
        )}%). ${crop.waterNeeds === "high" ? "Bu bitki daha çox su istəyir — yaxın vaxtda suvarma yaxşı olar." : "Yüngül suvarma faydalı olar."}`,
        priority: "critical",
      });
    } else if (soilMoisture < 45) {
      recs.push({
        type: "irrigation",
        title: "Suvarma planı",
        description: `Torpaq nəmliyi (${soilMoisture.toFixed(
          0,
        )}%) orta səviyyədədir. 24–48 saat üçün suvarma planı qurun.`,
        priority: "medium",
      });
    } else if (soilMoisture > 80) {
      recs.push({
        type: "warning",
        title: "Nəmlik yüksəkdir",
        description: `Torpaq nəmliyi yüksəktir (${soilMoisture.toFixed(
          0,
        )}%). Drenajı yoxlayın, suvarmanı azaltmaq məsləhətdir.`,
        priority: "high",
      });
    } else {
      recs.push({
        type: "info",
        title: "Torpaq nəmliyi balansdadır",
        description: `Torpaq nəmliyi (${soilMoisture.toFixed(
          0,
        )}%) normal aralıqdadır.`,
        priority: "low",
      });
    }

    // Rain advice
    if (precipitation >= 5) {
      recs.push({
        type: "info",
        title: "Yağış gözlənilir",
        description: `Seçilmiş gün üçün yağış təxminən ${Math.round(
          precipitation,
        )} mm ola bilər. Suvarmanı bir qədər azaltmaq olar.`,
        priority: "low",
      });
    }

    // pH
    if (ph !== undefined) {
      if (ph < crop.optimalPh.min) {
        recs.push({
          type: "fertilizer",
          title: "pH aşağıdır",
          description: `pH (${ph.toFixed(
            1,
          )}) optimal aralıqdan aşağıdır (${crop.optimalPh.min}-${crop.optimalPh.max}). pH-ı qaldırmaq üçün uyğun əlavələr düşünün.`,
          priority: "medium",
        });
      } else if (ph > crop.optimalPh.max) {
        recs.push({
          type: "fertilizer",
          title: "pH yüksəkdir",
          description: `pH (${ph.toFixed(
            1,
          )}) optimal aralıqdan yuxarıdır. Torpağı balanslamaq üçün uyğun gübrə strategiyası seçin.`,
          priority: "medium",
        });
      }
    }

    // NPK only today if sensor
    if (
      dayIndex === 0 &&
      sensorData?.nitrogen !== undefined &&
      sensorData.nitrogen < 20
    ) {
      recs.push({
        type: "fertilizer",
        title: "Azot dəstəyi",
        description:
          "Azot səviyyəsi aşağıdır. Uyğun azot gübrəsi ilə dəstək vermək olar.",
        priority: "medium",
      });
    }
    if (
      dayIndex === 0 &&
      sensorData?.phosphorus !== undefined &&
      sensorData.phosphorus < 15
    ) {
      recs.push({
        type: "fertilizer",
        title: "Fosfor dəstəyi",
        description:
          "Fosfor səviyyəsi aşağıdır. Uyğun fosfor gübrəsi planlaya bilərsiniz.",
        priority: "medium",
      });
    }
    if (
      dayIndex === 0 &&
      sensorData?.potassium !== undefined &&
      sensorData.potassium < 100
    ) {
      recs.push({
        type: "fertilizer",
        title: "Kalium dəstəyi",
        description:
          "Kalium səviyyəsi aşağıdır. Uyğun kalium gübrəsi ilə balanslamaq olar.",
        priority: "medium",
      });
    }

    // General tip
    recs.push({
      type: "info",
      title: "Rutin nəzarət",
      description: `${crop.nameAz} üçün yetişmə müddəti təxminən ${crop.growthDays} gündür. Zərərverici müşahidəsini rutin saxlayın.`,
      priority: "low",
    });

    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 } as const;
    return recs.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
    );
  }, [crop, weather, sensorData, forecast, dayIndex, day]);

  const dayTitle =
    dayIndex === 0
      ? "Bu gün"
      : day
        ? new Date(day.date).toLocaleDateString("az-AZ", { weekday: "long" })
        : "Seçilmiş gün";

  const counts = {
    critical: recommendations.filter((r) => r.priority === "critical").length,
    high: recommendations.filter((r) => r.priority === "high").length,
    medium: recommendations.filter((r) => r.priority === "medium").length,
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "irrigation":
        return <Droplets className="h-4 w-4" />;
      case "fertilizer":
        return <Leaf className="h-4 w-4" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  // “quiet luxury” styles
  const getRowStyles = (priority: string) => {
    switch (priority) {
      case "critical":
        return {
          wrap: "border-destructive/20 bg-destructive/5",
          bar: "bg-destructive/60",
          badge: <Badge variant="destructive">Prioritet</Badge>,
        };
      case "high":
        return {
          wrap: "border-amber-500/20 bg-amber-500/10",
          bar: "bg-amber-500/60",
          badge: (
            <Badge className="bg-amber-500/80 hover:bg-amber-500/80">
              Yüksək
            </Badge>
          ),
        };
      case "medium":
        return {
          wrap: "border-primary/20 bg-primary/5",
          bar: "bg-primary/60",
          badge: <Badge variant="secondary">Orta</Badge>,
        };
      default:
        return {
          wrap: "border-border/60 bg-background/60",
          bar: "bg-muted-foreground/30",
          badge: <Badge variant="outline">Məlumat</Badge>,
        };
    }
  };

  const summaryText =
    counts.critical > 0
      ? "Bir neçə prioritet addım var — əvvəl onları həll edək."
      : counts.high > 0
        ? "Diqqətə dəyər məqamlar var — kiçik optimallaşdırmalar kömək edər."
        : "Şərait stabil görünür — rutin nəzarət kifayətdir.";

  return (
    <motion.div variants={wrap} initial="hidden" animate="show">
      <Card className="border-border/60 bg-background/60 backdrop-blur overflow-hidden">
        <div className="pointer-events-none absolute inset-0" />

        <CardHeader className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-muted/40">
                  <Sparkles className="h-4 w-4" />
                </span>
                <span>
                  Tövsiyələr{" "}
                  <span className="text-muted-foreground">• {dayTitle}</span>
                </span>
              </CardTitle>
              <CardDescription>
                {crop.nameAz} üçün seçilmiş günün şəraitinə görə yığcam plan
              </CardDescription>
            </div>

            <div className="hidden md:flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{lastUpdate.toLocaleTimeString("az-AZ")}</span>
            </div>
          </div>

          {/* calm counters */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {counts.critical > 0 && (
              <Badge variant="destructive">{counts.critical} prioritet</Badge>
            )}
            {counts.high > 0 && (
              <Badge className="bg-amber-500/80 hover:bg-amber-500/80">
                {counts.high} yüksək
              </Badge>
            )}
            {counts.medium > 0 && (
              <Badge variant="secondary">{counts.medium} orta</Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pb-6">
          <AnimatePresence initial={false}>
            {recommendations.map((rec, idx) => {
              const s = getRowStyles(rec.priority);
              return (
                <motion.div
                  key={`${rec.title}-${idx}`}
                  variants={row}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  layout
                  whileHover={{ y: -2 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className={`relative overflow-hidden rounded-2xl border ${s.wrap}`}
                >
                  {/* left accent bar */}
                  <div
                    className={`absolute left-0 top-0 h-full w-1.5 ${s.bar}`}
                  />

                  <div className="p-4 pl-5">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-background/50">
                        {getIcon(rec.type)}
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold tracking-tight">
                            {rec.title}
                          </h3>
                          {s.badge}
                        </div>

                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {rec.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* soft summary */}
          <div className="mt-4 rounded-2xl border bg-muted/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4" />
              <h3 className="font-semibold">Xülasə</h3>
            </div>
            <p className="text-sm text-muted-foreground">{summaryText}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
