"use client";

import Link from "next/link";
import { motion, Variants } from "framer-motion";
import { RouteGuard } from "@/components/route-guard";
import { ContextPreview } from "@/components/context-preview";
import { DashboardStats } from "@/components/dashboard-stats";
import { Recommendations } from "@/components/recommendations";
import { useAppStore } from "@/lib/store/app-store";
import RenderIf from "@/lib/renderIf";
import { Button } from "@/components/ui/button";
import { MessageCircle, Sparkles, ArrowRight } from "lucide-react";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut", delay: i * 0.06 },
  }),
};

export default function DashboardPage() {
  const {
    currentWeather,
    forecast,
    sensorData,
    selectedCrop,
    dayIndex,
    setDayIndex,
  } = useAppStore();

  return (
    <RouteGuard need={["location", "weather", "crop"]}>
      <div className="relative">
        {/* subtle background */}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-emerald-500/10 via-background to-background" />

        <div className="mx-auto max-w-6xl px-4 md:px-0 py-6 space-y-6">
          {/* Header */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="flex flex-col md:flex-row md:items-end md:justify-between gap-3"
          >
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                Panel
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                Bu gün üçün qısa xülasə və tövsiyələr.
              </p>
            </div>
          </motion.div>

          {/* Top row: Context + CTA */}
          <div className="grid gap-4 md:grid-cols-12">
            <motion.div
              custom={1}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="md:col-span-8"
            >
              <ContextPreview />
            </motion.div>

            <motion.div
              custom={2}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="md:col-span-4"
            >
              {/* AI hero card */}
              <div className="relative overflow-hidden rounded-2xl border bg-background/60 p-5 backdrop-blur">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/15 via-transparent to-transparent" />

                <div className="relative flex items-start gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-muted/40">
                    <MessageCircle className="h-5 w-5" />
                  </div>

                  <div className="space-y-1 flex-1">
                    <p className="text-sm font-semibold">Sürətli sual?</p>
                    <p className="text-xs text-muted-foreground">
                      Şəraitə uyğun cavab və tövsiyəni dərhal al.
                    </p>

                    <div className="pt-3">
                      <Button asChild className="w-full justify-between">
                        <Link href="/chat" aria-label="AI ilə danışmağa başla">
                          AI ilə danış
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Recommendations */}
          <RenderIf condition={!!selectedCrop}>
            <motion.div
              custom={3}
              variants={fadeUp}
              initial="hidden"
              animate="show"
            >
              <Recommendations
                crop={selectedCrop!}
                weather={currentWeather || undefined}
                sensorData={sensorData || undefined}
                forecast={forecast}
                dayIndex={dayIndex}
              />
            </motion.div>
          </RenderIf>

          {/* Stats */}
          <motion.div
            custom={4}
            variants={fadeUp}
            initial="hidden"
            animate="show"
          >
            <DashboardStats
              weather={currentWeather || undefined}
              sensorData={sensorData || undefined}
              forecast={forecast}
              crop={selectedCrop || undefined}
              dayIndex={dayIndex}
              onDayIndexChange={setDayIndex}
            />
          </motion.div>
        </div>
      </div>
    </RouteGuard>
  );
}
