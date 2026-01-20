"use client";

import React from "react";

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

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
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Leaf className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-foreground">AgriSense</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Ağıllı Kənd Təsərrüfatı
              </p>
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

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>

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

          {/* Mobile Theme Toggle */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Mobile Sidebar */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-background/80"
            onClick={() => setIsSidebarOpen(false)}
          />
          <div className="absolute left-0 top-16 bottom-0 w-64 bg-card border-r border-border p-4">
            <nav className="space-y-2">
              {steps.map((step, index) => (
                <button
                  key={step.id}
                  onClick={() => {
                    if (index <= currentStepIndex || canProceed()) {
                      setCurrentStep(step.id);
                      setIsSidebarOpen(false);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                    currentStep === step.id
                      ? "bg-primary text-primary-foreground"
                      : index < currentStepIndex
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {step.icon}
                  {step.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Progress Bar */}
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

        {/* Step Content */}
        <div className="max-w-4xl mx-auto">
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
              />

              <div className="grid lg:grid-cols-2 gap-6">
                <Recommendations
                  crop={selectedCrop}
                  weather={currentWeather || undefined}
                  sensorData={sensorData || undefined}
                  forecast={forecast}
                />
                <AIChat
                  location={location}
                  crop={selectedCrop}
                  weather={currentWeather}
                  sensorData={sensorData}
                />
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
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
      </main>

      {/* Footer */}
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
                      AgriSense
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
                2024 AgriSense. Bütün hüquqlar qorunur.
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
    </div>
  );
}
