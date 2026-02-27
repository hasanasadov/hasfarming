"use client";

import {
  BarChart3,
  Bot,
  Cloud,
  Database,
  Leaf,
  MapPin,
  Sprout,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="relative mt-12 overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent opacity-50" />

      <div className="relative border-t border-border">
        <div className="container mx-auto px-4 py-10">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Brand Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/20 ring-2 ring-primary/30">
                  <Leaf className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">
                    {t("footer.brand")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("footer.brandSub")}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("footer.brandDesc")}
              </p>
            </div>

            {/* Features Section */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <Sprout className="h-4 w-4 text-primary" />
                {t("footer.features")}
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Cloud className="h-4 w-4 text-primary/70" />
                  {t("footer.feat1")}
                </li>
                <li className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-primary/70" />
                  {t("footer.feat2")}
                </li>
                <li className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary/70" />
                  {t("footer.feat3")}
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary/70" />
                  {t("footer.feat4")}
                </li>
              </ul>
            </div>

            {/* Stats Section */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                {t("footer.stats")}
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-card border border-border/50">
                  <p className="text-2xl font-bold text-primary">12+</p>
                  <p className="text-xs text-muted-foreground">{t("footer.cropTypes")}</p>
                </div>
                <div className="p-3 rounded-lg bg-card border border-border/50">
                  <p className="text-2xl font-bold text-primary">7</p>
                  <p className="text-xs text-muted-foreground">
                    {t("footer.dailyForecast")}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-card border border-border/50">
                  <p className="text-2xl font-bold text-primary">24/7</p>
                  <p className="text-xs text-muted-foreground">
                    {t("footer.liveMonitoring")}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-card border border-border/50">
                  <p className="text-2xl font-bold text-primary">AI</p>
                  <p className="text-xs text-muted-foreground">
                    {t("footer.smartAdvice")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-8 pt-6 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {t("footer.copyright")}
            </p>
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                {t("footer.systemActive")}
              </span>
              <span className="text-xs text-muted-foreground">v1.0.0</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
