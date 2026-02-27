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
import { useTranslation } from "@/lib/i18n";

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
  const { t } = useTranslation();
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
    const dayLabel = dayIndex === 0 ? t("rec.todayLabel") : t("rec.selectedDayLabel");
    if (temp < crop.optimalTemp.min) {
      const diff = crop.optimalTemp.min - temp;
      recs.push({
        type: "warning",
        title: t("rec.tempLow"),
        description: `${dayLabel} ${t("rec.tempLowDesc").replace("{{temp}}", temp.toFixed(1)).replace("{{crop}}", crop.nameAz).replace("{{diff}}", diff.toFixed(1))}`,
        priority: diff > 5 ? "critical" : "high",
      });
    } else if (temp > crop.optimalTemp.max) {
      const diff = temp - crop.optimalTemp.max;
      recs.push({
        type: "warning",
        title: t("rec.tempHigh"),
        description: `${dayLabel} ${t("rec.tempHighDesc").replace("{{temp}}", temp.toFixed(1)).replace("{{crop}}", crop.nameAz).replace("{{diff}}", diff.toFixed(1))}`,
        priority: diff > 5 ? "critical" : "high",
      });
    } else {
      recs.push({
        type: "info",
        title: t("rec.tempOk"),
        description: t("rec.tempOkDesc").replace("{{temp}}", temp.toFixed(1)).replace("{{crop}}", crop.nameAz),
        priority: "low",
      });
    }

    // Soil moisture
    if (soilMoisture < 30) {
      const hint = crop.waterNeeds === "high" ? t("rec.irrigationCriticalHintHigh") : t("rec.irrigationCriticalHintNormal");
      recs.push({
        type: "irrigation",
        title: t("rec.irrigationCritical"),
        description: t("rec.irrigationCriticalDesc").replace("{{moisture}}", soilMoisture.toFixed(0)).replace("{{hint}}", hint),
        priority: "critical",
      });
    } else if (soilMoisture < 45) {
      recs.push({
        type: "irrigation",
        title: t("rec.irrigationPlan"),
        description: t("rec.irrigationPlanDesc").replace("{{moisture}}", soilMoisture.toFixed(0)),
        priority: "medium",
      });
    } else if (soilMoisture > 80) {
      recs.push({
        type: "warning",
        title: t("rec.moistureHigh"),
        description: t("rec.moistureHighDesc").replace("{{moisture}}", soilMoisture.toFixed(0)),
        priority: "high",
      });
    } else {
      recs.push({
        type: "info",
        title: t("rec.moistureOk"),
        description: t("rec.moistureOkDesc").replace("{{moisture}}", soilMoisture.toFixed(0)),
        priority: "low",
      });
    }

    // Rain advice
    if (precipitation >= 5) {
      recs.push({
        type: "info",
        title: t("rec.rainExpected"),
        description: t("rec.rainExpectedDesc").replace("{{rain}}", Math.round(precipitation).toString()),
        priority: "low",
      });
    }

    // pH
    if (ph !== undefined) {
      if (ph < crop.optimalPh.min) {
        recs.push({
          type: "fertilizer",
          title: t("rec.phLow"),
          description: t("rec.phLowDesc").replace("{{ph}}", ph.toFixed(1)).replace("{{min}}", crop.optimalPh.min.toString()).replace("{{max}}", crop.optimalPh.max.toString()),
          priority: "medium",
        });
      } else if (ph > crop.optimalPh.max) {
        recs.push({
          type: "fertilizer",
          title: t("rec.phHigh"),
          description: t("rec.phHighDesc").replace("{{ph}}", ph.toFixed(1)),
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
        title: t("rec.nitrogenSupport"),
        description: t("rec.nitrogenDesc"),
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
        title: t("rec.phosphorusSupport"),
        description: t("rec.phosphorusDesc"),
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
        title: t("rec.potassiumSupport"),
        description: t("rec.potassiumDesc"),
        priority: "medium",
      });
    }

    // General tip
    recs.push({
      type: "info",
      title: t("rec.routineCheck"),
      description: t("rec.routineCheckDesc").replace("{{crop}}", crop.nameAz).replace("{{days}}", crop.growthDays.toString()),
      priority: "low",
    });

    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 } as const;
    return recs.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
    );
  }, [crop, weather, sensorData, forecast, dayIndex, day]);

  const dayTitle =
    dayIndex === 0
      ? t("common.today")
      : day
        ? new Date(day.date).toLocaleDateString("az-AZ", { weekday: "long" })
        : t("common.selectedDay");

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
          badge: <Badge variant="destructive">{t("rec.priorityBadge")}</Badge>,
        };
      case "high":
        return {
          wrap: "border-amber-500/20 bg-amber-500/10",
          bar: "bg-amber-500/60",
          badge: (
            <Badge className="bg-amber-500/80 hover:bg-amber-500/80">
              {t("rec.highBadge")}
            </Badge>
          ),
        };
      case "medium":
        return {
          wrap: "border-primary/20 bg-primary/5",
          bar: "bg-primary/60",
          badge: <Badge variant="secondary">{t("rec.mediumBadge")}</Badge>,
        };
      default:
        return {
          wrap: "border-border/60 bg-background/60",
          bar: "bg-muted-foreground/30",
          badge: <Badge variant="outline">{t("rec.infoBadge")}</Badge>,
        };
    }
  };

  const summaryText =
    counts.critical > 0
      ? t("rec.summaryTextCritical")
      : counts.high > 0
        ? t("rec.summaryTextHigh")
        : t("rec.summaryTextStable");

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
                  {t("rec.title")}{" "}
                  <span className="text-muted-foreground">• {dayTitle}</span>
                </span>
              </CardTitle>
              <CardDescription>
                {crop.nameAz} {t("rec.subtitle")}
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
              <Badge variant="destructive">{counts.critical} {t("rec.priorityCount")}</Badge>
            )}
            {counts.high > 0 && (
              <Badge className="bg-amber-500/80 hover:bg-amber-500/80">
                {counts.high} {t("rec.highCount")}
              </Badge>
            )}
            {counts.medium > 0 && (
              <Badge variant="secondary">{counts.medium} {t("rec.mediumCount")}</Badge>
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
              <h3 className="font-semibold">{t("rec.summary")}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{summaryText}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
