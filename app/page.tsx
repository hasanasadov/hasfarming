"use client";

import React, { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import Lenis from "@studio-freight/lenis";
import {
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import {
  Bot,
  CloudSun,
  LayoutDashboard,
  MapPin,
  MoveRight,
  Settings,
  Sprout,
  Leaf,
  ShieldCheck,
  Sparkles,
  Droplets,
  ThermometerSun,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useTranslation } from "@/lib/i18n";

function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

function useSmoothScroll() {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;

    const lenis = new Lenis({
      duration: 0.9,
      smoothWheel: true,
      wheelMultiplier: 0.85,
      touchMultiplier: 1.05,
    });

    let raf = 0;

    const loop = (t: number) => {
      lenis.raf(t);
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };

    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const onVis = () => {
      if (document.visibilityState === "hidden") stop();
      else start();
    };

    start();
    document.addEventListener("visibilitychange", onVis);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      stop();
      lenis.destroy?.();
    };
  }, [reduce]);
}

function Container({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}
    >
      {children}
    </div>
  );
}

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px -15% 0px" });
  const reduce = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={
        reduce
          ? { duration: 0 }
          : { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }
      }
      style={{ willChange: "transform, opacity" }}
    >
      {children}
    </motion.div>
  );
}

function TopBar() {
  const { t } = useTranslation();

  const nav = useMemo(
    () => [
      {
        href: "/dashboard",
        label: t("nav.dashboard"),
        icon: <LayoutDashboard className="h-4 w-4" />,
      },
      {
        href: "/weather",
        label: t("nav.weather"),
        icon: <CloudSun className="h-4 w-4" />,
      },
      {
        href: "/crops",
        label: t("nav.crops"),
        icon: <Sprout className="h-4 w-4" />,
      },
      { href: "/chat", label: t("nav.chat"), icon: <Bot className="h-4 w-4" /> },
      {
        href: "/settings",
        label: t("nav.settings"),
        icon: <Settings className="h-4 w-4" />,
      },
    ],
    [t],
  );

  return (
    <div className="fixed inset-x-0 top-0 z-50">
      <Container>
        <div
          className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 shadow-sm backdrop-blur
                     dark:border-white/10 dark:bg-white/5"
        >
          <Link href="/" className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <Leaf className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                {t("common.appName")}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-white/60">
                {t("common.subtitle")}
              </div>
            </div>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {nav.map((x) => (
              <Link
                key={x.href}
                href={x.href}
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900
                           dark:text-white/75 dark:hover:bg-white/10 dark:hover:text-white"
              >
                {x.icon}
                {x.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            <Link
              href="/dashboard"
              className="hidden rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50
                         dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 md:inline-flex"
            >
              {t("nav.dashboard")} <MoveRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}

function Hero() {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const inView = useInView(ref, { margin: "-20% 0px -20% 0px" });

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (reduce) return; // reduced-motion-da video autoplay/pause ilə məşğul olmuruq

    if (inView) v.play().catch(() => {});
    else v.pause();
  }, [inView, reduce]);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // reduced-motion varsa, transformları sabit saxla
  const videoY = useTransform(
    scrollYProgress,
    [0, 1],
    ["0%", reduce ? "0%" : "18%"],
  );
  const contentY = useTransform(
    scrollYProgress,
    [0, 1],
    ["0%", reduce ? "0%" : "24%"],
  );
  const contentOpacity = useTransform(
    scrollYProgress,
    [0, 0.9],
    [1, reduce ? 1 : 0],
  );

  return (
    <section ref={ref} className="relative overflow-hidden pt-28 bg-black">
      <div className="absolute inset-0 bg-grid opacity-40 dark:opacity-55" />

      {/* Glow (bir az yüngülləşdirilmiş) */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full bg-emerald-200/50 blur-2xl dark:bg-emerald-400/18" />
        <div className="absolute -right-24 top-12 h-[420px] w-[420px] rounded-full bg-sky-200/45 blur-2xl dark:bg-indigo-500/14" />
      </div>

      {/* Video */}
      <motion.div
        style={{ y: videoY }}
        className="absolute inset-0 "
      >
        <div
          className="absolute inset-0 bg-gradient-to-b 
                     from-[#06080F]/20 via-[#06080F]/55 to-[#06080F]"
        />
        <video
          ref={videoRef}
          className="h-full w-full object-cover opacity-30 dark:opacity-40"
          autoPlay={!reduce}
          muted
          loop
          playsInline
          preload="none"
          poster="/hero-poster.jpg"
          disablePictureInPicture
        >
          <source src="https://f9r6p9yyly.ufs.sh/f/xMaCRSVimNM8Li3pbjYHTB6wW9OhPJQznud4CcY8RZDoALEU" type="video/mp4" />
        </video>
      </motion.div>

      <Container className="relative pb-10">
        <motion.div style={{ y: contentY, opacity: contentOpacity }}>
          <Reveal>
            <div
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs text-slate-600 shadow-sm md:backdrop-blur
                         dark:border-white/10 dark:bg-white/5 dark:text-white/70"
            >
              <Sparkles className="h-4 w-4 text-emerald-600" />
              {t("landing.hero.badge")}
            </div>
          </Reveal>

          <Reveal delay={0.08} className="mt-5">
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight  sm:text-5xl text-white">
              {t("landing.hero.title1")}{" "}
              <span className=" text-emerald-300">
                {t("landing.hero.title2")}
              </span>{" "}
              {t("landing.hero.title3")}
            </h1>
          </Reveal>

          <Reveal delay={0.14} className="mt-3">
            <p className="max-w-2xl text-base  sm:text-lg text-white/70">
              {t("landing.hero.subtitle")}
            </p>
          </Reveal>

          <Reveal
            delay={0.2}
            className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              {t("landing.hero.cta")} <MoveRight className="h-4 w-4" />
            </Link>

            <Link
              href="/weather"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border  px-5 py-3 text-sm font-semibold  transition 
                         border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              {t("landing.hero.ctaSecondary")} <MapPin className="h-4 w-4 text-emerald-600" />
            </Link>

            <div className="mt-1 flex items-center gap-4 text-xs text-white sm:mt-0">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" /> {t("landing.hero.stat1")}
              </span>
              <span className="inline-flex items-center gap-2">
                <Bot className="h-4 w-4 text-emerald-600" /> {t("landing.hero.stat3")}
              </span>
            </div>
          </Reveal>

          {/* Quick Actions */}
          <Reveal delay={0.28} className="mt-10 grid gap-4 lg:grid-cols-5">
            {[
              { href: "/dashboard", title: t("nav.dashboard"), desc: t("landing.hero.stat1"), icon: <LayoutDashboard className="h-5 w-5" /> },
              { href: "/chat", title: t("nav.chat"), desc: t("landing.hero.stat3"), icon: <Bot className="h-5 w-5" /> },
              { href: "/weather", title: t("nav.weather"), desc: t("landing.hero.stat2"), icon: <CloudSun className="h-5 w-5" /> },
              { href: "/crops", title: t("nav.crops"), desc: t("context.crop"), icon: <Sprout className="h-5 w-5" /> },
              { href: "/settings", title: t("nav.settings"), desc: t("topbar.sensor"), icon: <Settings className="h-5 w-5" /> },
            ].map((c, idx) => (
              <Link
                key={c.href}
                href={c.href}
                className={`group rounded-3xl border  p-5 shadow-sm transitionmd:backdrop-blur
                           border-white/10 bg-white/5 hover:bg-white/10 ${idx >= 2 ? "hidden md:block" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-700
                               dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200"
                  >
                    {c.icon}
                  </div>
                  <MoveRight className="h-4 w-4 text-slate-400 transition group-hover:text-slate-700 dark:text-white/40 dark:group-hover:text-white/80" />
                </div>
                <div className="mt-4 text-base font-semibold text-white">
                  {c.title}
                </div>
                <div className="mt-1 text-xs text-white/65">
                  {c.desc}
                </div>
              </Link>
            ))}
          </Reveal>

          {/* <Reveal delay={0.34} className="mt-6 grid gap-4 md:grid-cols-4">
            {[
              {
                k: "Aktiv sahə",
                v: "12",
                s: "+2 bu ay",
                icon: <MapPin className="h-4 w-4" />,
              },
              {
                k: "Seçilmiş bitkilər",
                v: "8",
                s: "Pomidor lider",
                icon: <Sprout className="h-4 w-4" />,
              },
              {
                k: "Risk siqnalları",
                v: "3",
                s: "1 kritik",
                icon: <AlertTriangle className="h-4 w-4" />,
              },
              {
                k: "İcra olunan plan",
                v: "74%",
                s: "Bu həftə",
                icon: <CheckCircle2 className="h-4 w-4" />,
              },
            ].map((x) => (
              <div
                key={x.k}
                className="rounded-3xl border border-slate-200 bg-white/70 p-5 shadow-sm md:backdrop-blur
                           dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-white/60">
                  <span className="inline-flex items-center gap-2">
                    {x.icon}
                    {x.k}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-2 py-1 dark:border-white/10 dark:bg-white/5">
                    demo
                  </span>
                </div>
                <div className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">
                  {x.v}
                </div>
                <div className="mt-1 text-xs text-slate-600 dark:text-white/65">
                  {x.s}
                </div>
              </div>
            ))}
          </Reveal> */}
        </motion.div>
      </Container>

      <div className="h-10 bg-gradient-to-b from-transparent to-white dark:to-[#06080F]" />
    </section>
  );
}

function Flow() {
  const { t } = useTranslation();

  const steps = [
    {
      k: "01",
      t: t("landing.flow.step1.title"),
      d: t("landing.flow.step1.desc"),
    },
    {
      k: "02",
      t: t("landing.flow.step2.title"),
      d: t("landing.flow.step2.desc"),
    },
    {
      k: "03",
      t: t("landing.flow.step3.title"),
      d: t("landing.flow.step3.desc"),
    },
  ];

  return (
    <section className="bg-white py-16 dark:bg-[#06080F]">
      <Container>
        <Reveal>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            {t("landing.flow.title")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-white/70">
            {t("landing.flow.subtitle")}
          </p>
        </Reveal>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.k} delay={0.06 * i}>
              <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-white/10 dark:bg-white/5">
                <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-emerald-200/35 blur-2xl dark:bg-emerald-400/10" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      {s.k}
                    </div>
                    <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-white/65">
                      {t("landing.flow.badge")}
                    </div>
                  </div>
                  <div className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">
                    {s.t}
                  </div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-white/70">
                    {s.d}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

function MiniPreview() {
  const { t } = useTranslation();

  const cards = [
    {
      title: t("landing.preview.item1.title"),
      level: t("landing.preview.item1.level"),
      icon: <ThermometerSun className="h-4 w-4" />,
      tone: "border-red-200 bg-red-50 text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-200",
    },
    {
      title: t("landing.preview.item2.title"),
      level: t("landing.preview.item2.level"),
      icon: <Droplets className="h-4 w-4" />,
      tone: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200",
    },
    {
      title: t("landing.preview.item3.title"),
      level: t("landing.preview.item3.level"),
      icon: <Sparkles className="h-4 w-4" />,
      tone: "border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white/80",
    },
  ];

  return (
    <section className="bg-slate-50 py-16 dark:bg-[#06080F]">
      <Container>
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              {t("landing.preview.title")}
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-white/70">
              {t("landing.preview.subtitle")}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                {t("nav.dashboard")} <MoveRight className="h-4 w-4" />
              </Link>
              <Link
                href="/chat"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50
                           dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
              >
                {t("nav.chat")} <Bot className="h-4 w-4 text-emerald-600" />
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="rounded-[2rem] border border-slate-200 bg-white/80 p-6 shadow-sm md:backdrop-blur dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {t("landing.preview.recTitle")}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-white/60">
                    {t("landing.preview.recSubtitle")}
                  </div>
                </div>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                  {t("landing.preview.critical")}
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {cards.map((c) => (
                  <div
                    key={c.title}
                    className={cx("rounded-2xl border p-4", c.tone)}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      {c.icon} {c.title}
                      <span className="ml-2 rounded-full border border-current/20 px-2 py-0.5 text-[11px] font-semibold">
                        {c.level}
                      </span>
                    </div>
                    <div className="mt-1 text-xs opacity-80">
                      {t("landing.preview.demoText")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

function FAQ() {
  const { t } = useTranslation();

  const items = [
    { q: t("landing.faq.q1"), a: t("landing.faq.a1") },
    { q: t("landing.faq.q2"), a: t("landing.faq.a2") },
    { q: t("landing.faq.q3"), a: t("landing.faq.a3") },
    { q: t("landing.faq.q4"), a: t("landing.faq.a4") },
  ];

  return (
    <section className="bg-white py-16 dark:bg-[#06080F]">
      <Container>
        <Reveal>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            {t("landing.faq.title")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-white/70">
            {t("landing.hero.subtitle")}
          </p>
        </Reveal>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {items.map((x, i) => (
            <Reveal key={x.q} delay={0.05 * i}>
              <div className="rounded-3xl h-full border border-slate-200 bg-slate-50 p-6 dark:border-white/10 dark:bg-white/5">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  {x.q}
                </div>
                <div className="mt-2 text-sm text-slate-600 dark:text-white/70">
                  {x.a}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

function FooterCTA() {
  const { t } = useTranslation();

  return (
    <section className="bg-slate-50 py-16 dark:bg-[#06080F]">
      <Container>
        <Reveal>
          <div className="rounded-[2rem] border border-slate-200 bg-gradient-to-b from-emerald-50 to-white p-8 dark:border-white/10 dark:from-emerald-500/10 dark:to-white/5">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">
                  {t("landing.footerCta.title")}
                </h3>
                <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-white/70">
                  {t("landing.footerCta.subtitle")}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/weather"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  {t("nextStep.selectLocationAction")} <MapPin className="h-4 w-4" />
                </Link>
                <Link
                  href="/crops"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50
                             dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                >
                  {t("nextStep.selectCropAction")} <Sprout className="h-4 w-4 text-emerald-600" />
                </Link>
                <Link
                  href="/chat"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50
                             dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                >
                  {t("nav.chat")} <Bot className="h-4 w-4 text-emerald-600" />
                </Link>
              </div>
            </div>
          </div>
        </Reveal>

        <div className="mt-10 text-center text-xs text-slate-500 dark:text-white/55">
          © {new Date().getFullYear()} {t("landing.footer.copy")}
        </div>
      </Container>
    </section>
  );
}

export default function HomePage() {
  useSmoothScroll();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#06080F] dark:text-white">
      <TopBar />
      <Hero />
      <Flow />
      <MiniPreview />
      <FAQ />
      <FooterCTA />
    </main>
  );
}
