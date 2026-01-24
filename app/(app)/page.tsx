// "use client";

// import Link from "next/link";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { useAppStore } from "@/lib/store/app-store";
// import { Cloud, Sprout, BarChart3, Bot } from "lucide-react";

// export default function OverviewPage() {
//   const { location, selectedCrop, currentWeather, forecast } = useAppStore();

//   const readyWeather = !!location && !!currentWeather && forecast.length > 0;
//   const readyCrop = !!selectedCrop;

//   return (
//     <div className="space-y-6">
//       <Card className="border-border/50 shadow-lg">
//         <CardHeader>
//           <CardTitle>AgriSense – Ümumi</CardTitle>
//           <CardDescription>
//             Səhifələrə bölündü: hava/məkan, bitki, panel və AI chat.
//           </CardDescription>
//         </CardHeader>
//         <CardContent className="flex flex-wrap gap-2">
//           <Button
//             asChild
//             variant={readyWeather ? "secondary" : "default"}
//             className="gap-2"
//           >
//             <Link href="/weather">
//               <Cloud className="h-4 w-4" /> Hava & Məkan
//             </Link>
//           </Button>
//           <Button
//             asChild
//             variant={readyCrop ? "secondary" : "default"}
//             className="gap-2"
//           >
//             <Link href="/crops">
//               <Sprout className="h-4 w-4" /> Bitkilər
//             </Link>
//           </Button>
//           <Button asChild variant="secondary" className="gap-2">
//             <Link href="/dashboard">
//               <BarChart3 className="h-4 w-4" /> Panel
//             </Link>
//           </Button>
//           <Button asChild variant="secondary" className="gap-2">
//             <Link href="/chat">
//               <Bot className="h-4 w-4" /> AI Chat
//             </Link>
//           </Button>
//         </CardContent>
//       </Card>

//       <Card className="border-border/50">
//         <CardHeader>
//           <CardTitle className="text-base">Hazır status</CardTitle>
//           <CardDescription>
//             AI və panelin işləməsi üçün minimumlar
//           </CardDescription>
//         </CardHeader>
//         <CardContent className="text-sm text-muted-foreground space-y-1">
//           <div>• Məkan: {location ? "✅" : "❌"}</div>
//           <div>• Hava datası: {readyWeather ? "✅" : "❌"}</div>
//           <div>• Bitki: {readyCrop ? "✅" : "❌"}</div>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }

"use client";

import { RouteGuard } from "@/components/route-guard";
import { ContextPreview } from "@/components/context-preview";
import { DashboardStats } from "@/components/dashboard-stats";
import { Recommendations } from "@/components/recommendations";
import { useAppStore } from "@/lib/store/app-store";

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
      <div className="space-y-6">
        <ContextPreview />

        <DashboardStats
          weather={currentWeather || undefined}
          sensorData={sensorData || undefined}
          forecast={forecast}
          crop={selectedCrop || undefined}
          dayIndex={dayIndex}
          onDayIndexChange={setDayIndex}
        />

        {selectedCrop && (
          <Recommendations
            crop={selectedCrop}
            weather={currentWeather || undefined}
            sensorData={sensorData || undefined}
            forecast={forecast}
            dayIndex={dayIndex}
          />
        )}
      </div>
    </RouteGuard>
  );
}
