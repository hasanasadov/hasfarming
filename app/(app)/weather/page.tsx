"use client";

import { LocationPicker } from "@/components/location-picker";
import { WeatherDisplay } from "@/components/weather-display";
import { useAppStore } from "@/lib/store/app-store";

export default function WeatherPage() {
  const { location, setLocation, setWeather } = useAppStore();

  return (
    <div className="space-y-6">
      <LocationPicker
        onLocationSelect={setLocation}
        selectedLocation={location}
      />

      {location && (
        <div className="space-y-6">
          <WeatherDisplay
            location={location}
            onWeatherData={(current, forecast) => setWeather(current, forecast)}
          />
        </div>
      )}
    </div>
  );
}
