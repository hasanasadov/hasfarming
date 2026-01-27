"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store/app-store";
import { MapPin, Sprout, Database } from "lucide-react";

export function TopbarContext() {
  const { location, selectedCrop, dataSource } = useAppStore();

  const ctx = useMemo(() => {
    const loc = location?.address?.split(",")[0] ?? "Məkan seçilməyib";
    const crop = selectedCrop?.nameAz ?? "Bitki seçilməyib";
    const src = dataSource === "firebase" ? "Sensor" : "Proqnoz";
    return { loc, crop, src };
  }, [location, selectedCrop, dataSource]);

  return (
    <div className="flex items-center gap-2 min-w-0">
      <Badge variant="secondary" className="gap-1 rounded-full max-w-[220px]">
        <MapPin className="h-3 w-3" />
        <span className="truncate">{ctx.loc}</span>
      </Badge>

      <Badge
        variant="secondary"
        className="gap-1 rounded-full max-w-[200px] hidden sm:inline-flex"
      >
        <Sprout className="h-3 w-3" />
        <span className="truncate">{ctx.crop}</span>
      </Badge>

      <Badge
        variant="secondary"
        className="gap-1 rounded-full hidden md:inline-flex"
      >
        <Database className="h-3 w-3" />
        {ctx.src}
      </Badge>
    </div>
  );
}
