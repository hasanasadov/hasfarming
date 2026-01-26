"use client";

import { useMemo, useState, useEffect } from "react";
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
  CheckCircle,
} from "lucide-react";
import type {
  Crop,
  WeatherData,
  FirebaseSensorData,
  Recommendation,
} from "@/lib/types";

interface RecommendationsProps {
  crop: Crop;
  weather?: WeatherData; // currentWeather
  sensorData?: FirebaseSensorData;
  forecast?: WeatherData[];
  dayIndex?: number; // ✅ NEW
}

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

    // ✅ Selected day values
    const temp = isToday
      ? (sensorData?.airTemperature ?? weather?.temp ?? day?.temp ?? 20)
      : (day?.temp ?? 20);
    const humidity = isToday
      ? (sensorData?.humidity ?? weather?.humidity ?? day?.humidity ?? 50)
      : (day?.humidity ?? 50);
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
        )}°C aşağıdır. Örtük/istixana tədbiri düşün.`,
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
        )}°C yuxarıdır. Kölgə + suvarmanı optimallaşdır.`,
        priority: diff > 5 ? "critical" : "high",
      });
    } else {
      recs.push({
        type: "info",
        title: "Temperatur uyğundur",
        description: `Temperatur (${temp.toFixed(1)}°C) ${crop.nameAz} üçün optimaldır.`,
        priority: "low",
      });
    }

    // Soil moisture / irrigation
    if (soilMoisture < 30) {
      recs.push({
        type: "irrigation",
        title: "Dərhal suvarma lazımdır",
        description: `Torpaq nəmliyi çox aşağıdır (${soilMoisture.toFixed(
          0,
        )}%). ${crop.waterNeeds === "high" ? "Bu bitki çox su istəyir — dərhal suvar." : "Torpağı suvar."}`,
        priority: "critical",
      });
    } else if (soilMoisture < 45) {
      recs.push({
        type: "irrigation",
        title: "Suvarma planla",
        description: `Torpaq nəmliyi (${soilMoisture.toFixed(
          0,
        )}%) orta səviyyədədir. Yaxın 24–48 saatda suvarma planı qur.`,
        priority: "medium",
      });
    } else if (soilMoisture > 80) {
      recs.push({
        type: "warning",
        title: "Həddindən artıq nəmlik",
        description: `Torpaq nəmliyi çox yüksəkdir (${soilMoisture.toFixed(
          0,
        )}%). Kök çürüməsi riski var. Suvarmanı dayandır, drenajı yoxla.`,
        priority: "high",
      });
    } else {
      recs.push({
        type: "info",
        title: "Torpaq nəmliyi yaxşıdır",
        description: `Torpaq nəmliyi (${soilMoisture.toFixed(0)}%) normal aralıqdadır.`,
        priority: "low",
      });
    }

    // Rain-based advice (selected day)
    if (precipitation >= 5) {
      recs.push({
        type: "info",
        title: "Yağış var — suvarmanı azaldın",
        description: `Seçilmiş gün üçün yağış ${Math.round(
          precipitation,
        )} mm gözlənilir. Suvarmanı azalt və drenajı yoxla.`,
        priority: "low",
      });
    }

    // pH only if sensor exists and today
    if (ph !== undefined) {
      if (ph < crop.optimalPh.min) {
        recs.push({
          type: "fertilizer",
          title: "Torpaq turşudur (pH aşağı)",
          description: `pH (${ph.toFixed(
            1,
          )}) optimal aralıqdan aşağıdır (${crop.optimalPh.min}-${crop.optimalPh.max}). Əhəng əlavəsi ilə pH-ı yüksəlt.`,
          priority: "medium",
        });
      } else if (ph > crop.optimalPh.max) {
        recs.push({
          type: "fertilizer",
          title: "Torpaq qələvidir (pH yüksək)",
          description: `pH (${ph.toFixed(
            1,
          )}) optimal aralıqdan yuxarıdır. Turş gübrə/kükürd istifadə et.`,
          priority: "medium",
        });
      }
    }

    // NPK only if sensor exists and today
    if (
      dayIndex === 0 &&
      sensorData?.nitrogen !== undefined &&
      sensorData.nitrogen < 20
    ) {
      recs.push({
        type: "fertilizer",
        title: "Azot azdır",
        description:
          "Azot səviyyəsi aşağıdır. Ürea və ya ammonium nitrat istifadə et.",
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
        title: "Fosfor azdır",
        description:
          "Fosfor səviyyəsi aşağıdır. Superfosfat / DAP istifadə et.",
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
        title: "Kalium azdır",
        description:
          "Kalium səviyyəsi aşağıdır. Kalium sulfat və ya KCl istifadə et.",
        priority: "medium",
      });
    }

    // General tip
    recs.push({
      type: "info",
      title: "Ümumi plan",
      description: `${crop.nameAz} üçün yetişmə müddəti təxminən ${crop.growthDays} gündür. Zərərverici müşahidəsini rutin et.`,
      priority: "low",
    });

    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 } as const;
    return recs.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
    );
  }, [crop, weather, sensorData, forecast, dayIndex, day]);

  const getIcon = (type: string) => {
    switch (type) {
      case "irrigation":
        return <Droplets className="h-5 w-5" />;
      case "fertilizer":
        return <Leaf className="h-5 w-5" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case "critical":
        return "border-destructive bg-destructive/5";
      case "high":
        return "border-orange-500 bg-orange-50 dark:bg-orange-500/10";
      case "medium":
        return "border-primary/30 bg-primary/5";
      default:
        return "border-border bg-card";
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "critical":
        return <Badge variant="destructive">Kritik</Badge>;
      case "high":
        return (
          <Badge className="bg-orange-500 hover:bg-orange-600">Yüksək</Badge>
        );
      case "medium":
        return <Badge variant="secondary">Orta</Badge>;
      default:
        return <Badge variant="outline">Məlumat</Badge>;
    }
  };

  const criticalCount = recommendations.filter(
    (r) => r.priority === "critical",
  ).length;
  const highCount = recommendations.filter((r) => r.priority === "high").length;

  const dayTitle =
    dayIndex === 0
      ? "Bu gün"
      : day
        ? new Date(day.date).toLocaleDateString("az-AZ", { weekday: "long" })
        : "Seçilmiş gün";

  return (
    <Card className="border-border/50 shadow-lg py-12">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Sparkles className="h-5 w-5 text-primary" />
              Tövsiyələr • {dayTitle}
            </CardTitle>
            <CardDescription>
              {crop.nameAz} üçün seçilmiş günün şəraitinə görə
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <Badge variant="destructive">{criticalCount} kritik</Badge>
            )}
            {highCount > 0 && (
              <Badge className="bg-orange-500">{highCount} yüksək</Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {lastUpdate.toLocaleTimeString("az-AZ")}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {recommendations.map((rec, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-2xl border-2 ${getPriorityStyles(rec.priority)}`}
          >
            <div className="flex items-start gap-3">
              <div
                className={
                  rec.priority === "critical"
                    ? "text-destructive"
                    : rec.priority === "high"
                      ? "text-orange-500"
                      : "text-primary"
                }
              >
                {getIcon(rec.type)}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground">{rec.title}</h3>
                  {getPriorityBadge(rec.priority)}
                </div>
                <p className="text-sm text-muted-foreground">
                  {rec.description}
                </p>
              </div>
            </div>
          </div>
        ))}

        <div className="mt-4 p-4 rounded-2xl bg-primary/10 border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Xülasə</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {criticalCount > 0
              ? "Kritik məsələ var — prioritet tədbir gör."
              : highCount > 0
                ? "Diqqət tələb edən məsələlər var."
                : "Şərait yaxşıdır — rutin nəzarəti davam etdir."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
