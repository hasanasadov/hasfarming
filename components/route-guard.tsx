"use client";

import Link from "next/link";
import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store/app-store";
import {
  MapPin,
  CloudSun,
  Sprout,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useTranslation } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n";

type GuardNeed = "location" | "weather" | "crop";

const NEED_META: Record<
  GuardNeed,
  {
    titleKey: TranslationKey;
    descKey: TranslationKey;
    href: string;
    ctaKey: TranslationKey;
    icon: React.ReactNode;
  }
> = {
  location: {
    titleKey: "guard.locationTitle",
    descKey: "guard.locationDesc",
    href: "/weather",
    ctaKey: "guard.locationCta",
    icon: <MapPin className="h-4 w-4" />,
  },
  weather: {
    titleKey: "guard.weatherTitle",
    descKey: "guard.weatherDesc",
    href: "/weather",
    ctaKey: "guard.weatherCta",
    icon: <CloudSun className="h-4 w-4" />,
  },
  crop: {
    titleKey: "guard.cropTitle",
    descKey: "guard.cropDesc",
    href: "/crops",
    ctaKey: "guard.cropCta",
    icon: <Sprout className="h-4 w-4" />,
  },
};

const container: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut", staggerChildren: 0.06 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
  exit: { opacity: 0, y: 8, transition: { duration: 0.2 } },
};

export function RouteGuard({
  need,
  children,
}: {
  need: GuardNeed[];
  children: React.ReactNode;
}) {
  const { location, currentWeather, forecast, selectedCrop } = useAppStore();
  const { t } = useTranslation();

  const missing: GuardNeed[] = [];

  if (need.includes("location") && !location) missing.push("location");
  if (need.includes("weather") && (!currentWeather || forecast.length === 0))
    missing.push("weather");
  if (need.includes("crop") && !selectedCrop) missing.push("crop");

  if (missing.length === 0) return <>{children}</>;

  const total = need.length;
  const done = total - missing.length;

  return (
    <Card className="relative overflow-hidden p-6 md:p-8">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-muted/40 via-background to-background" />

      <motion.div
        className="relative space-y-6"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl md:text-2xl font-semibold tracking-tight">
              {t("guard.title")}
            </h2>
            <p className="text-sm md:text-base text-muted-foreground">
              {t("guard.desc")}
            </p>
          </div>

          <div className="hidden md:flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1.5 backdrop-blur">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">
              {done}/{total} {t("common.ready")}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {need.map((n) => {
            const isMissing = missing.includes(n);
            return (
              <div
                key={n}
                className={[
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition",
                  isMissing
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300"
                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300",
                ].join(" ")}
                title={
                  isMissing
                    ? t("guard.missingHint")
                    : t("guard.doneHint")
                }
              >
                {NEED_META[n].icon}
                <span className="font-medium">{t(NEED_META[n].titleKey)}</span>
                {isMissing ? (
                  <span className="opacity-80">{t("guard.complete")}</span>
                ) : (
                  <span className="inline-flex items-center gap-1 opacity-90">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {t("guard.done")}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <AnimatePresence initial={false}>
          <motion.div className="grid gap-3 md:grid-cols-2" layout>
            {missing.map((n) => (
              <motion.div
                key={n}
                variants={item}
                initial="hidden"
                animate="show"
                exit="exit"
                layout
                whileHover={{ y: -2 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                className="rounded-xl border bg-background/60 p-4 backdrop-blur"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-muted/40">
                    {NEED_META[n].icon}
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">{t(NEED_META[n].titleKey)}</p>
                      <span className="text-xs rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2 py-1 border border-amber-500/20">
                        {t("guard.recommended")}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {t(NEED_META[n].descKey)}
                    </p>

                    <div className="pt-3">
                      <Button asChild className="w-full justify-between">
                        <Link href={NEED_META[n].href}>
                          {t(NEED_META[n].ctaKey)}
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button asChild variant="secondary">
            <Link href="/weather">{t("guard.weatherAndLocation")}</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/crops">{t("guard.crops")}</Link>
          </Button>
        </div>
      </motion.div>
    </Card>
  );
}
