"use client";

import React, { useRef, useEffect } from "react";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Database,
  Cloud,
  Sprout,
  BarChart3,
  Bot,
  ChevronRight,
  ChevronLeft,
  Leaf,
  Menu,
  X,
} from "lucide-react";
import { LocationPicker } from "@/components/location-picker";
import { DataSourceSelector } from "@/components/data-source-selector";
import { WeatherDisplay } from "@/components/weather-display";
import { FirebaseSensorDisplay } from "@/components/firebase-sensor-display";
import { CropSelector } from "@/components/crop-selector";
import { Recommendations } from "@/components/recommendations";
import { AIChat } from "@/components/ai-chat";
import { DashboardStats } from "@/components/dashboard-stats";
import {
  Location,
  DataSource,
  Crop,
  WeatherData,
  FirebaseSensorData,
  AppStep,
} from "@/lib/types";
import { MapPicker } from "@/components/map-picker";
import { ThemeToggle } from "@/components/theme-toggle";

const steps: { id: AppStep; label: string; icon: React.ReactNode }[] = [
  { id: "location", label: "Məkan", icon: <MapPin className="h-4 w-4" /> },
  {
    id: "source",
    label: "Data Mənbəyi",
    icon: <Database className="h-4 w-4" />,
  },
  { id: "data", label: "Məlumatlar", icon: <Cloud className="h-4 w-4" /> },
  { id: "crop", label: "Bitki", icon: <Sprout className="h-4 w-4" /> },
  { id: "dashboard", label: "Panel", icon: <BarChart3 className="h-4 w-4" /> },
];

export default function SmartFarmingApp() {
  const [currentStep, setCurrentStep] = useState<AppStep>("location");
  const [location, setLocation] = useState<Location | null>(null);
  const [dataSource, setDataSource] = useState<DataSource | null>(null);
  const [firebaseUrl, setFirebaseUrl] = useState<string>("");
  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(
    null,
  );
  const [forecast, setForecast] = useState<WeatherData[]>([]);
  const [sensorData, setSensorData] = useState<FirebaseSensorData | null>(null);
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);
  const [dayIndex, setDayIndex] = useState(0);

  const stepContentRef = useRef<HTMLDivElement>(null);

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  // Auto-scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (stepContentRef.current) {
      stepContentRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [currentStep]);

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case "location":
        return location !== null;
      case "source":
        return dataSource !== null;
      case "data":
        return currentWeather !== null || sensorData !== null;
      case "crop":
        return selectedCrop !== null;
      case "dashboard":
        return true;
      default:
        return true;
    }
  }, [
    currentStep,
    location,
    dataSource,
    currentWeather,
    sensorData,
    selectedCrop,
  ]);

  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length && canProceed()) {
      setCurrentStep(steps[nextIndex].id);
    }
  };

  const goToPrevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id);
    }
  };

  const handleLocationSelect = useCallback((loc: Location) => {
    setLocation(loc);
  }, []);

  const handleSourceSelect = useCallback(
    (source: DataSource, fbUrl?: string) => {
      setDataSource(source);
      if (fbUrl) setFirebaseUrl(fbUrl);
    },
    [],
  );

  const handleWeatherData = useCallback(
    (current: WeatherData, forecastData: WeatherData[]) => {
      setCurrentWeather(current);
      setForecast(forecastData);
    },
    [],
  );

  const handleSensorData = useCallback((data: FirebaseSensorData) => {
    setSensorData(data);
  }, []);

  const handleCropSelect = useCallback((crop: Crop) => {
    setSelectedCrop(crop);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        currentStep={currentStep}
        currentStepIndex={currentStepIndex}
        setCurrentStep={setCurrentStep}
        location={location}
        selectedCrop={selectedCrop}
        canProceed={canProceed}
      />
      <main className="container mx-auto px-4 py-6">
        <ProgressBar currentStepIndex={currentStepIndex} />

        {/* Step Content */}
        <div ref={stepContentRef} className="scroll-mt-24">
          {currentStep === "location" && (
            <div className="space-y-6">
              <LocationPicker
                onLocationSelect={handleLocationSelect}
                selectedLocation={location}
              />
              <MapPicker
                onLocationSelect={handleLocationSelect}
                selectedLocation={location}
              />
            </div>
          )}

          {currentStep === "source" && (
            <DataSourceSelector
              onSourceSelect={handleSourceSelect}
              selectedSource={dataSource}
            />
          )}

          {currentStep === "data" && location && (
            <div className="space-y-6">
              {dataSource === "weather" && (
                <WeatherDisplay
                  location={location}
                  onWeatherData={handleWeatherData}
                />
              )}
              {dataSource === "firebase" && firebaseUrl && (
                <>
                  <FirebaseSensorDisplay
                    firebaseUrl={firebaseUrl}
                    onSensorData={handleSensorData}
                  />
                  <WeatherDisplay
                    location={location}
                    onWeatherData={handleWeatherData}
                  />
                </>
              )}
            </div>
          )}

          {currentStep === "crop" && (
            <CropSelector
              onCropSelect={handleCropSelect}
              selectedCrop={selectedCrop}
            />
          )}

          {currentStep === "dashboard" && selectedCrop && (
            <div className="space-y-6">
              <DashboardStats
                weather={currentWeather || undefined}
                sensorData={sensorData || undefined}
                forecast={forecast}
                crop={selectedCrop}
                dayIndex={dayIndex}
                onDayIndexChange={setDayIndex}
              />

              <div className="grid lg:grid-cols-2 gap-6">
                <Recommendations
                  crop={selectedCrop}
                  weather={currentWeather || undefined}
                  sensorData={sensorData || undefined}
                  forecast={forecast}
                  dayIndex={dayIndex}
                />
                <AIChat
                  location={location}
                  crop={selectedCrop}
                  weather={currentWeather}
                  sensorData={sensorData}
                  forecast={forecast}
                  dayIndex={dayIndex}
                  dataSource={dataSource}
                />
              </div>
            </div>
          )}
        </div>

        <NavigationButtons
          currentStepIndex={currentStepIndex}
          goToNextStep={goToNextStep}
          goToPrevStep={goToPrevStep}
          canProceed={canProceed}
          setCurrentStep={setCurrentStep}
        />
      </main>
    </div>
  );
}

const Navbar = ({
  currentStep,
  currentStepIndex,
  setCurrentStep,
  location,
  selectedCrop,
  canProceed,
}: {
  currentStep: AppStep;
  currentStepIndex: number;
  setCurrentStep: (step: AppStep) => void;
  location: Location | null;
  selectedCrop: Crop | null;
  canProceed: () => boolean;
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Leaf className="h-6 w-6 text-primary" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-lg text-foreground">AgriSense</h1>
              <p className="text-xs text-muted-foreground">
                Ağıllı Kənd Təsərrüfatı
              </p>
            </div>
          </div>

          {/* Mobile Current Step Indicator */}
          <div className="flex md:hidden items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
              {steps[currentStepIndex].icon}
              <span>{steps[currentStepIndex].label}</span>
              <span className="text-xs opacity-70">
                ({currentStepIndex + 1}/{steps.length})
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => {
                  if (index <= currentStepIndex || canProceed()) {
                    setCurrentStep(step.id);
                  }
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  currentStep === step.id
                    ? "bg-primary text-primary-foreground"
                    : index < currentStepIndex
                      ? "bg-primary/10 text-primary hover:bg-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
                disabled={index > currentStepIndex && !canProceed()}
              >
                {step.icon}
                <span className="hidden lg:inline">{step.label}</span>
              </button>
            ))}
          </nav>

          {/* Status Badges & Theme Toggle */}
          <div className="hidden md:flex items-center gap-2">
            {location && (
              <Badge variant="secondary" className="gap-1">
                <MapPin className="h-3 w-3" />
                {location.address?.split(",")[0]}
              </Badge>
            )}
            {selectedCrop && (
              <Badge variant="secondary" className="gap-1">
                {selectedCrop.icon} {selectedCrop.nameAz}
              </Badge>
            )}
            <ThemeToggle />
          </div>

          {/* Mobile Actions */}
          <div className="flex md:hidden items-center gap-1">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
          <div className="absolute right-0 top-16 bottom-0 w-72 bg-card border-l border-border p-4 shadow-xl">
            {/* Status Section */}
            <div className="mb-4 p-3 rounded-lg bg-muted/50 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Cari Vəziyyət
              </p>
              <div className="flex flex-wrap gap-2">
                {location ? (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <MapPin className="h-3 w-3" />
                    {location.address?.split(",")[0]}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="gap-1 text-xs text-muted-foreground"
                  >
                    <MapPin className="h-3 w-3" />
                    Məkan seçilməyib
                  </Badge>
                )}
                {selectedCrop ? (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    {selectedCrop.icon} {selectedCrop.nameAz}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="gap-1 text-xs text-muted-foreground"
                  >
                    <Sprout className="h-3 w-3" />
                    Bitki seçilməyib
                  </Badge>
                )}
              </div>
            </div>

            {/* Navigation */}
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Addımlar
            </p>
            <nav className="space-y-1">
              {steps.map((step, index) => (
                <button
                  key={step.id}
                  onClick={() => {
                    if (index <= currentStepIndex || canProceed()) {
                      setCurrentStep(step.id);
                      setIsSidebarOpen(false);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm transition-colors ${
                    currentStep === step.id
                      ? "bg-primary text-primary-foreground"
                      : index < currentStepIndex
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {step.icon}
                    {step.label}
                  </div>
                  {index < currentStepIndex && (
                    <span className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
};

const ProgressBar = ({ currentStepIndex }: { currentStepIndex: number }) => {
  return (
    <div className="mb-8">
      <div className="flex justify-between text-sm text-muted-foreground mb-2">
        <span>
          Addım {currentStepIndex + 1} / {steps.length}
        </span>
        <span>{steps[currentStepIndex].label}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{
            width: `${((currentStepIndex + 1) / steps.length) * 100}%`,
          }}
        />
      </div>
    </div>
  );
};

const NavigationButtons = ({
  currentStepIndex,
  goToNextStep,
  goToPrevStep,
  canProceed,
  setCurrentStep,
}: {
  currentStepIndex: number;
  goToNextStep: () => void;
  goToPrevStep: () => void;
  canProceed: () => boolean;
  setCurrentStep: (step: AppStep) => void;
}) => {
  return (
    <div className="max-w-4xl mx-auto mt-8 flex justify-between">
      <Button
        type="button"
        variant="outline"
        onClick={goToPrevStep}
        disabled={currentStepIndex === 0}
        className="gap-2 bg-transparent"
      >
        <ChevronLeft className="h-4 w-4" />
        Geri
      </Button>

      {currentStepIndex < steps.length - 1 ? (
        <Button
          type="button"
          onClick={goToNextStep}
          disabled={!canProceed()}
          className="gap-2"
        >
          Davam et
          <ChevronRight className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          type="button"
          onClick={() => setCurrentStep("location")}
          variant="outline"
          className="gap-2"
        >
          Yenidən başla
        </Button>
      )}
    </div>
  );
};
