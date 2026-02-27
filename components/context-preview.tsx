"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store/app-store";
import {
  MapPin,
  Sprout,
  Droplets,
  ThermometerSun,
  ChevronDown,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export function ContextPreview() {
  const { location, selectedCrop, dayIndex, forecast, dataSource, sensorData } =
    useAppStore();
  const { t } = useTranslation();

  const [open, setOpen] = useState(false);

  const d = forecast?.[dayIndex];

  const soilDisplay =
    dataSource === "firebase" &&
    dayIndex === 0 &&
    sensorData?.soilMoisture != null
      ? `${Math.round(sensorData.soilMoisture)}%`
      : d
        ? `${Math.round(d.soilMoisture ?? 0)}%`
        : "—";

  const tempMax = d ? Math.round(d.tempMax) : undefined;
  const tempMin = d ? Math.round(d.tempMin) : undefined;

  const tempDisplay =
    tempMax != null && tempMin != null ? `${tempMax}° / ${tempMin}°` : "—";

  const place = location?.address?.split(",")[0] ?? t("topbar.noLocation");
  const cropName = selectedCrop?.nameAz ?? t("topbar.noCrop");
  const cropIcon = selectedCrop?.icon ?? "🌱";

  return (
    <div className="relative overflow-hidden md:rounded-2xl border bg-background/60 backdrop-blur">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-muted/40 via-background to-background" />

      <div className="relative">
        {/* Compact clickable summary */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={[
            "w-full text-left p-4 md:p-5",
            "flex items-center gap-3",
            "transition hover:bg-muted/30",
          ].join(" ")}
        >
          <div className="flex-shrink-0 h-10 w-10 rounded-xl border bg-muted/40 flex items-center justify-center text-base">
            {cropIcon}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <div className="truncate text-sm font-semibold">{cropName}</div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                • {dayIndex === 0 ? t("common.today") : `${dayIndex + 1}${t("context.nthDay")}`}
              </span>
            </div>

            {/* super compact meta line */}
            <div className="mt-0.5 text-xs text-muted-foreground truncate">
              {place}
            </div>
          </div>

          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-background/50"
            aria-hidden="true"
          >
            <ChevronDown className="h-4 w-4" />
          </motion.span>
        </button>

        {/* Expandable details */}
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="details"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 md:px-5 md:pb-5 space-y-3">
                {/* KPIs */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border bg-background/50 px-3 py-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ThermometerSun className="h-4 w-4" />
                      {t("context.temperature")}
                    </div>
                    <div className="mt-1 text-sm font-semibold">
                      {tempDisplay}
                    </div>
                  </div>

                  <div className="rounded-xl border bg-background/50 px-3 py-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Droplets className="h-4 w-4" />
                      {t("context.soilMoisture")}
                    </div>
                    <div className="mt-1 text-sm font-semibold">
                      {soilDisplay}
                    </div>
                  </div>
                </div>

                {/* Location row */}
                <div className="rounded-xl border bg-background/50 px-3 py-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {t("context.location")}
                  </div>
                  <div className="mt-1 text-sm font-semibold truncate">
                    {place}
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    asChild
                    size="sm"
                    variant="secondary"
                    className="rounded-xl w-full justify-center"
                  >
                    <Link href="/weather" aria-label={t("nav.weather")}>
                      <MapPin className="h-4 w-4 mr-2" />
                      {t("context.location")}
                    </Link>
                  </Button>

                  <Button
                    asChild
                    size="sm"
                    variant="secondary"
                    className="rounded-xl w-full justify-center"
                  >
                    <Link href="/crops" aria-label={t("nav.crops")}>
                      <Sprout className="h-4 w-4 mr-2" />
                      {t("context.crop")}
                    </Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
