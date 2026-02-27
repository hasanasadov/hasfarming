"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAppStore } from "@/lib/store/app-store";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

import {
  LayoutDashboard,
  Cloud,
  Sprout,
  Bot,
  Settings,
  Menu,
  MapPin,
  Leaf,
  Database,
  RotateCcw,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TopbarContext } from "./topbar-context";
import { LanguageSwitcher } from "./language-switcher";
import { useTranslation } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n";

type NavItem = {
  href: string;
  labelKey: TranslationKey;
  icon: React.ComponentType<{ className?: string }>;
  match?: "exact" | "prefix";
};

const NAV: NavItem[] = [
  {
    href: "/dashboard",
    labelKey: "nav.dashboard",
    icon: LayoutDashboard,
    match: "exact",
  },
  { href: "/weather", labelKey: "nav.weather", icon: Cloud, match: "prefix" },
  { href: "/crops", labelKey: "nav.crops", icon: Sprout, match: "prefix" },
  { href: "/chat", labelKey: "nav.chat", icon: Bot, match: "prefix" },
  { href: "/settings", labelKey: "nav.settings", icon: Settings, match: "prefix" },
];

function isActivePath(pathname: string, href: string, match: NavItem["match"]) {
  if (match === "prefix")
    return pathname === href || pathname.startsWith(`${href}/`);
  return pathname === href;
}

function Brand({ collapsed }: { collapsed: boolean }) {
  const { t } = useTranslation();
  return (
    <Link
      href="/"
      className={[
        "group flex items-center gap-3 rounded-2xl px-3 py-2 transition",
        "hover:bg-muted/60",
      ].join(" ")}
      aria-label={t("common.homePage")}
    >
      <span className="inline-flex h-10 w-10 p-2 items-center justify-center rounded-2xl border bg-primary/10">
        <Leaf className="h-5 w-5 text-primary" />
      </span>

      {!collapsed && (
        <div className="min-w-0">
          <div className="font-semibold leading-tight">{t("common.appName")}</div>
          <div className="text-xs text-muted-foreground -mt-0.5 whitespace-nowrap">
            {t("common.subtitle")}
          </div>
        </div>
      )}
    </Link>
  );
}

function NavLinks({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex flex-col gap-2">
        <Brand collapsed={collapsed} />

        <nav className="px-2 space-y-1" aria-label={t("nav.mainNav")}>
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(pathname, item.href, item.match);
            const label = t(item.labelKey);

            const linkEl = (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={[
                  "group flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition",
                  "focus:outline-none focus:ring-2 focus:ring-primary/30",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                  collapsed ? "justify-center" : "",
                ].join(" ")}
              >
                <span
                  className={[
                    "inline-flex h-9 w-9  p-2 items-center justify-center rounded-xl border transition",
                    active
                      ? "border-primary-foreground/20 bg-primary-foreground/10"
                      : "border-transparent bg-transparent group-hover:border-border/60 group-hover:bg-background/40",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" />
                </span>

                {!collapsed && <span className="flex-1 whitespace-nowrap">{label}</span>}

                {!collapsed && active && (
                  <span className="text-[10px] rounded-full bg-primary-foreground/15 px-2 py-0.5">
                    {t("common.active")}
                  </span>
                )}
              </Link>
            );

            // collapsed mode => tooltip with label
            if (!collapsed) return linkEl;

            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  {label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>
      </div>
    </TooltipProvider>
  );
}

export function AppShellPro({ children }: { children: React.ReactNode }) {
  const { reset } = useAppStore();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const onReset = useCallback(() => {
    const ok = window.confirm(t("common.restartConfirm"));
    if (ok) reset();
  }, [reset, t]);

  const asideWidth = collapsed ? 88 : 288;

  return (
    <div className="min-h-screen bg-background">
      <div className="hidden md:flex">
        <motion.aside
          animate={{ width: asideWidth }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          className="sticky top-0 h-screen border-r bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/40 overflow-hidden"
        >
          <div className="p-3">
            <NavLinks collapsed={collapsed} />
          </div>
        </motion.aside>

        <div className="min-w-0 flex-1">
          {/* topbar */}
          <header className="sticky top-0 z-40 border-b bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/40">
            <div className="h-14 px-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Button
                  size="icon"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setCollapsed((v) => !v)}
                  aria-label={collapsed ? t("nav.panelOpen") : t("nav.panelClose")}
                  title={collapsed ? t("nav.panelOpen") : t("nav.panelClose")}
                >
                  {collapsed ? (
                    <PanelLeftOpen className="h-4 w-4" />
                  ) : (
                    <PanelLeftClose className="h-4 w-4" />
                  )}
                </Button>

                <TopbarContext />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={onReset}
                  className="gap-2 rounded-xl"
                >
                  <RotateCcw className="h-4 w-4" />
                  {t("common.restart")}
                </Button>
                <LanguageSwitcher />
                <ThemeToggle />
              </div>
            </div>
          </header>

          <main className="p-4 lg:p-6">{children}</main>
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/50">
          <div className="h-14 px-4 flex items-center justify-between gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button size="icon" variant="outline" className="rounded-xl">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>

              <SheetContent side="left" className="p-0 w-80">
                <VisuallyHidden>
                  <SheetTitle>{t("nav.navigation")}</SheetTitle>
                </VisuallyHidden>

                <div className="p-3 flex flex-col h-full justify-between">
                  <NavLinks
                    collapsed={false}
                    onNavigate={() => setOpen(false)}
                  />

                  <div className="p-2">
                    <Button
                      variant="outline"
                      className="w-full rounded-xl gap-2"
                      onClick={() => {
                        onReset();
                        setOpen(false);
                      }}
                    >
                      <RotateCcw className="h-4 w-4" />
                      {t("common.restart")}
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Link href="/" className="min-w-0" aria-label={t("common.homePage")}>
              <Button variant="ghost" className="gap-2 rounded-xl px-2">
                <Leaf className="h-5 w-5 text-primary" />
                <span className="font-semibold truncate">{t("common.appName")}</span>
              </Button>
            </Link>

            <div className="flex items-center gap-1.5">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main>{children}</main>
      </div>
    </div>
  );
}
