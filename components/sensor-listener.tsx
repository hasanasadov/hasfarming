"use client";
import { useAppStore } from "@/lib/store/app-store";
import { FirebaseSensorDisplay } from "@/components/firebase-sensor-display";

export function SensorListener() {
  const firebaseUrl = useAppStore((s) => s.firebaseUrl);
  const setSensorData = useAppStore((s) => s.setSensorData);

  if (!firebaseUrl) return null;

  return (
    <div className="hidden">
      <FirebaseSensorDisplay
        firebaseUrl={firebaseUrl}
        onSensorData={setSensorData}
      />
    </div>
  );
}
