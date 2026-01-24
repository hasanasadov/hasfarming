"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
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
} from "lucide-react";

const NAV = [
  { href: "/", label: "Nə etməli", icon: LayoutDashboard },
  { href: "/weather", label: "Məkan və Hava", icon: Cloud },
  { href: "/crops", label: "Bitkilər", icon: Sprout },
  { href: "/chat", label: "AI Söhbət", icon: Bot },
  { href: "/settings", label: "Sensorum var", icon: Settings }, // ✅ NEW
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { location, selectedCrop, dataSource } = useAppStore();

  const status = useMemo(() => {
    const loc = location?.address?.split(",")[0];
    const crop = selectedCrop?.nameAz;
    const src = dataSource === "firebase" ? "Sensor" : "Weather";
    return { loc, crop, src };
  }, [location, selectedCrop, dataSource]);

  return (
    <div className="flex flex-col gap-2">
      {/* brand */}
      <Link
        href="/"
        onClick={onNavigate}
        className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted transition"
      >
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
          <Leaf className="h-6 w-6 text-primary" />
        </span>
        <div className="min-w-0">
          <div className="font-semibold leading-tight">AgriSense</div>
          <div className="text-xs text-muted-foreground -mt-0.5">
            Ağıllı Ferma
          </div>
        </div>
      </Link>

      {/* status pills */}
      <div className="px-3 pb-2">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="gap-1">
            <MapPin className="h-3 w-3" />
            {status.loc ?? "Məkan yoxdur"}
          </Badge>
          <Badge variant="secondary">
            {status.crop ? ` ${status.crop}` : "Bitki yoxdur"}
          </Badge>
          <Badge variant="secondary">{status.src}</Badge>
        </div>
      </div>

      {/* nav */}
      <div className="px-2 space-y-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={[
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function AppShellPro({ children }: { children: React.ReactNode }) {
  const { reset } = useAppStore();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop layout */}
      <div className="hidden md:grid md:grid-cols-[280px_1fr]">
        <aside className="sticky top-0 h-screen border-r bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/40">
          <div className="p-3">
            <NavLinks />
          </div>
        </aside>

        <div className="min-w-0">
          {/* topbar */}
          <header className="sticky top-0 z-40 border-b bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/40">
            <div className="h-14 px-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Nə etməli tətbiqi - Ağıllı Ferma idarəetməsi - Aİ dəstəyi
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={reset}>
                  Reset
                </Button>
                <ThemeToggle />
              </div>
            </div>
          </header>

          <main className="p-4 lg:p-6">{children}</main>
        </div>
      </div>

      {/* Mobile layout */}
      <div className="md:hidden">
        <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/50">
          <div className="h-14 px-4 flex items-center justify-between">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button size="icon" variant="outline">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-80">
                <VisuallyHidden>
                  <SheetTitle>Navigation Menu</SheetTitle>
                </VisuallyHidden>

                <div className="p-3">
                  <NavLinks onNavigate={() => setOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>

            <Link href="/" className="font-semibold">
              <Button
                className="inline-flex items-center gap-2"
                variant="ghost"
              >
                <Leaf className="h-5 w-5 text-primary" />
                AgriSense
              </Button>
            </Link>

            <Link href="/">
              <Button variant="outline" size="sm">
                Nə etməli ?
              </Button>
            </Link>
            <Link href="/chat">
              <Button variant="outline" size="sm">
                AI Söhbət
              </Button>
            </Link>

            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="p-4">{children}</main>
      </div>
    </div>
  );
}
