"use client";

import { LocationPicker } from "@/components/location-picker";
import { MapPicker } from "@/components/map-picker";
// import { DataSourceSelector } from "@/components/data-source-selector";
import { WeatherDisplay } from "@/components/weather-display";
// import { FirebaseSensorDisplay } from "@/components/firebase-sensor-display";
import { useAppStore } from "@/lib/store/app-store";

export default function WeatherPage() {
  const {
    location,
    dataSource,
    firebaseUrl,
    setLocation,
    // setDataSource,
    // setFirebaseUrl,
    setWeather,
    // setSensorData,
  } = useAppStore();

  return (
    <div className="space-y-6">
      <LocationPicker
        onLocationSelect={setLocation}
        selectedLocation={location}
      />
      <MapPicker onLocationSelect={setLocation} selectedLocation={location} />

      {/* <DataSourceSelector
        selectedSource={dataSource}
        onSourceSelect={(src, fbUrl) => {
          setDataSource(src);
          if (fbUrl) setFirebaseUrl(fbUrl);
        }}
      /> */}

      {location && (
        <div className="space-y-6">
          {/* {dataSource === "firebase" && firebaseUrl && (
            <FirebaseSensorDisplay
              firebaseUrl={firebaseUrl}
              onSensorData={setSensorData}
            />
          )} */}

          {/* Weather always useful */}
          <WeatherDisplay
            location={location}
            onWeatherData={(current, forecast) => setWeather(current, forecast)}
          />
        </div>
      )}
    </div>
  );
}
