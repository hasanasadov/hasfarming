"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store/app-store";

type GuardNeed = "location" | "weather" | "crop";

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

  return (
    <Card className="p-6 space-y-3">
      <h2 className="text-lg font-bold">Davam etmək üçün addımları tamamlayın</h2>
      <p className="text-sm text-muted-foreground">
        AI və panel düzgün işləsin deyə aşağıdakı addımları tamamlayın:
      </p>

      <ul className="text-sm list-disc pl-5 text-muted-foreground">
        {missing.includes("location") && <li>Məkan seçin</li>}
        {missing.includes("weather") && <li>Sensorunuz varsa əlavə edin</li>}
        {missing.includes("crop") && <li>Bitki seçin</li>}
      </ul>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button asChild variant="secondary">
          <Link href="/weather">Hava & Məkan</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/crops">Bitkilər</Link>
        </Button>
        {/* <Button asChild>
          <Link href="/">Ümumi səhifə</Link>
        </Button> */}
      </div>
    </Card>
  );
}
