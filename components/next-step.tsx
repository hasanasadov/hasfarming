"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store/app-store";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, MapPin, Sprout, Cloud, ArrowRight } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function NextStep() {
  const pathname = usePathname();
  const { location, selectedCrop, forecast } = useAppStore();
  const { t } = useTranslation();

  const hasLocation = !!location;
  const hasCrop = !!selectedCrop;
  const hasForecast = Array.isArray(forecast) && forecast.length > 0;

  const state = useMemo(() => {
    if (!hasCrop && !hasLocation) {
      return {
        step: 1,
        total: 3,
        href: "/crops",
        title: t("nextStep.letsStart"),
        desc: t("nextStep.letsStartDesc"),
        chips: [
          { ok: false, label: t("nextStep.chipCrop"), icon: <Sprout className="h-3.5 w-3.5" /> },
          { ok: false, label: t("nextStep.chipLocation"), icon: <MapPin className="h-3.5 w-3.5" /> },
        ],
      };
    }

    if (!hasCrop) {
      return {
        step: 1,
        total: 3,
        href: "/crops",
        title: t("nextStep.selectCrop"),
        desc: t("nextStep.selectCropDesc"),
        chips: [
          { ok: false, label: t("nextStep.chipCrop"), icon: <Sprout className="h-3.5 w-3.5" /> },
          { ok: hasLocation, label: t("nextStep.chipLocation"), icon: <MapPin className="h-3.5 w-3.5" /> },
        ],
      };
    }

    if (!hasLocation) {
      return {
        step: 2,
        total: 3,
        href: "/weather",
        title: t("nextStep.selectLocation"),
        desc: t("nextStep.selectLocationDesc"),
        chips: [
          { ok: true, label: t("nextStep.chipCrop"), icon: <Sprout className="h-3.5 w-3.5" /> },
          { ok: false, label: t("nextStep.chipLocation"), icon: <MapPin className="h-3.5 w-3.5" /> },
        ],
      };
    }

    if (!hasForecast) {
      return {
        step: 3,
        total: 3,
        href: "/weather",
        title: t("nextStep.loadForecast"),
        desc: t("nextStep.loadForecastDesc"),
        chips: [
          { ok: true, label: t("nextStep.chipCrop"), icon: <Sprout className="h-3.5 w-3.5" /> },
          { ok: true, label: t("nextStep.chipLocation"), icon: <MapPin className="h-3.5 w-3.5" /> },
          { ok: false, label: t("nextStep.chipForecast"), icon: <Cloud className="h-3.5 w-3.5" /> },
        ],
      };
    }

    return {
      step: 3,
      total: 3,
      href: "/dashboard",
      title: t("nextStep.allReady"),
      desc: pathname.startsWith("/dashboard")
        ? t("nextStep.allReadyDescDashboard")
        : t("nextStep.allReadyDescOther"),
      chips: [
        { ok: true, label: t("nextStep.chipCrop"), icon: <Sprout className="h-3.5 w-3.5" /> },
        { ok: true, label: t("nextStep.chipLocation"), icon: <MapPin className="h-3.5 w-3.5" /> },
        { ok: true, label: t("nextStep.chipForecast"), icon: <Cloud className="h-3.5 w-3.5" /> },
      ],
    };
  }, [hasCrop, hasLocation, hasForecast, pathname, t]);

  const progressPct = useMemo(() => {
    return clamp(Math.round((state.step / state.total) * 100), 0, 100);
  }, [state.step, state.total]);

  const actionLabel = useMemo(() => {
    if (!hasCrop) return t("nextStep.selectCropAction");
    if (!hasLocation) return t("nextStep.selectLocationAction");
    if (!hasForecast) return t("nextStep.refreshWeather");
    return t("nextStep.goToDashboard");
  }, [hasCrop, hasLocation, hasForecast, t]);

  const isDone = hasCrop && hasLocation && hasForecast;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl border border-border/60 bg-background/60 backdrop-blur"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-muted/40 via-background to-background" />

      <div className="relative p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-muted/40">
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : (
                  <ArrowRight className="h-4 w-4 text-primary" />
                )}
              </span>

              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground">
                  {state.title}
                </div>
                <div className="text-xs text-muted-foreground">{state.desc}</div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {state.chips.map((c, i) => (
                <Badge
                  key={i}
                  variant={c.ok ? "default" : "secondary"}
                  className="h-7 rounded-full gap-1.5"
                >
                  {c.icon}
                  {c.label}
                </Badge>
              ))}
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  {t("nextStep.step")} {state.step}/{state.total}
                </span>
                <span>{progressPct}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={false}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="h-full bg-primary"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-start">
            <AnimatePresence initial={false}>
              {isDone && pathname.startsWith("/dashboard") && (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.18 }}
                  className="hidden sm:block text-xs text-muted-foreground"
                >
                  {t("nextStep.youAreReady")}
                </motion.div>
              )}
            </AnimatePresence>

            <Button asChild className="rounded-xl gap-2">
              <Link href={state.href} aria-label={t("nextStep.nextStepLabel")}>
                {actionLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
