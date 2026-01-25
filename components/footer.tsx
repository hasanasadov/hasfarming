import {
  BarChart3,
  Bot,
  Cloud,
  Database,
  Leaf,
  MapPin,
  Sprout,
} from "lucide-react";

const Footer = () => {
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
                    Bərəkət
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Smart Farming Platform
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ağıllı kənd təsərrüfatı həlləri ilə məhsuldarlığınızı artırın.
                Real-time data, AI tövsiyələri və dəqiq proqnozlar.
              </p>
            </div>

            {/* Features Section */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <Sprout className="h-4 w-4 text-primary" />
                Xüsusiyyətlər
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Cloud className="h-4 w-4 text-primary/70" />7 günlük hava
                  proqnozu
                </li>
                <li className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-primary/70" />
                  Firebase sensor inteqrasiyası
                </li>
                <li className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary/70" />
                  AI-powered tövsiyələr
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary/70" />
                  GPS məkan izləmə
                </li>
              </ul>
            </div>

            {/* Stats Section */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Statistika
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-card border border-border/50">
                  <p className="text-2xl font-bold text-primary">12+</p>
                  <p className="text-xs text-muted-foreground">Bitki növü</p>
                </div>
                <div className="p-3 rounded-lg bg-card border border-border/50">
                  <p className="text-2xl font-bold text-primary">7</p>
                  <p className="text-xs text-muted-foreground">
                    Günlük proqnoz
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-card border border-border/50">
                  <p className="text-2xl font-bold text-primary">24/7</p>
                  <p className="text-xs text-muted-foreground">
                    Live monitoring
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-card border border-border/50">
                  <p className="text-2xl font-bold text-primary">AI</p>
                  <p className="text-xs text-muted-foreground">
                    Ağıllı məsləhətlər
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-8 pt-6 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              2026 Bərəkət. Bütün hüquqlar qorunur.
            </p>
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Sistem aktiv
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
