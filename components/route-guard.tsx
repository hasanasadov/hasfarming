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
import { motion, AnimatePresence ,Variants } from "framer-motion";

type GuardNeed = "location" | "weather" | "crop";

const NEED_META: Record<
  GuardNeed,
  {
    title: string;
    desc: string;
    href: string;
    cta: string;
    icon: React.ReactNode;
  }
> = {
  location: {
    title: "Məkan",
    desc: "Proqnoz və analiz daha dəqiq olsun deyə məkanı seçək.",
    href: "/weather",
    cta: "Məkanı seç",
    icon: <MapPin className="h-4 w-4" />,
  },
  weather: {
    title: "Hava məlumatı",
    desc: "Proqnoz yüklənsin — sensor varsa əlavə etmək də olar.",
    href: "/weather",
    cta: "Proqnozu yüklə",
    icon: <CloudSun className="h-4 w-4" />,
  },
  crop: {
    title: "Bitki",
    desc: "Tövsiyələr uyğun hesablansın deyə bitkini seçək.",
    href: "/crops",
    cta: "Bitkini seç",
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
      {/* soft background */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-muted/40 via-background to-background" />

      <motion.div
        className="relative space-y-6"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl md:text-2xl font-semibold tracking-tight">
              Kiçik bir quraşdırma qalıb
            </h2>
            <p className="text-sm md:text-base text-muted-foreground">
              Bir neçə addımı tamamlayıb daha dəqiq nəticələr əldə edək.
            </p>
          </div>

          <div className="hidden md:flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1.5 backdrop-blur">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">
              {done}/{total} hazırdır
            </span>
          </div>
        </div>

        {/* Soft status chips */}
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
                    ? "Bu addımı tamamlasanız daha dəqiq nəticə alarsınız"
                    : "Hazırdır"
                }
              >
                {NEED_META[n].icon}
                <span className="font-medium">{NEED_META[n].title}</span>
                {isMissing ? (
                  <span className="opacity-80">tamamlayaq</span>
                ) : (
                  <span className="inline-flex items-center gap-1 opacity-90">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    hazır
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Action list (animated) */}
        <AnimatePresence initial={false}>
          <motion.div
            className="grid gap-3 md:grid-cols-2"
            layout
          >
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
                      <p className="font-semibold">{NEED_META[n].title}</p>
                      <span className="text-xs rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2 py-1 border border-amber-500/20">
                        tövsiyə olunur
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {NEED_META[n].desc}
                    </p>

                    <div className="pt-3">
                      <Button asChild className="w-full justify-between">
                        <Link href={NEED_META[n].href}>
                          {NEED_META[n].cta}
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

        {/* Secondary quick links */}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button asChild variant="secondary">
            <Link href="/weather">Hava & Məkan</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/crops">Bitkilər</Link>
          </Button>
        </div>
      </motion.div>
    </Card>
  );
}
