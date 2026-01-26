"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store/app-store";
import RenderIf from "@/lib/renderIf";

export function NextStep() {
  const { location, selectedCrop, forecast } = useAppStore();
  const hasLocation = !!location;
  const hasCrop = !!selectedCrop;
  const hasForecast = forecast && forecast.length > 0;

  const pathName =
    typeof window !== "undefined" ? window.location.pathname : "";
  const isDashboardPage = pathName.startsWith("/dashboard");

  const offerAI = hasLocation && hasCrop && hasForecast && isDashboardPage;
  // Determine step and target
  let step = 1;
  let href = "/crops";
  if (!hasCrop) {
    step = 1;
    href = "/crops";
  } else if (!hasLocation) {
    step = 2;
    href = "/weather";
  } else {
    step = 3;
    href = "/"; // go to home when everything is ok
  }

  return (
    <div className="flex items-center  gap-4 p-6  text-center md:rounded-xl border bg-muted/20">
      <RenderIf condition={!hasLocation && !hasCrop}>
        <p>Bitki və məkan seç.</p>
      </RenderIf>

      <RenderIf condition={!hasLocation && hasCrop}>
        <p>Məkan seç.</p>
      </RenderIf>
      <RenderIf condition={hasLocation && !hasCrop}>
        <p>Bitki seç.</p>
      </RenderIf>

      <RenderIf condition={hasLocation && hasCrop && !hasForecast}>
        <p>Hava proqnozu yüklənmir.</p>
      </RenderIf>

      <RenderIf condition={hasLocation && hasCrop && hasForecast}>
        <p>Hər şey hazırdır! 😊</p>
      </RenderIf>

      <div className="ml-auto flex  items-center justify-center gap-3">
        <div className="text-sm text-muted-foreground">Addım {step}/3</div>
        <Button asChild>
          <Link href={href}>Növbəti addım</Link>
        </Button>
      </div>
    </div>
  );
}
