'use client'

import React from "react"

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  X
} from 'lucide-react'
import { LocationPicker } from '@/components/location-picker'
import { DataSourceSelector } from '@/components/data-source-selector'
import { WeatherDisplay } from '@/components/weather-display'
import { FirebaseSensorDisplay } from '@/components/firebase-sensor-display'
import { CropSelector } from '@/components/crop-selector'
import { Recommendations } from '@/components/recommendations'
import { AIChat } from '@/components/ai-chat'
import { DashboardStats } from '@/components/dashboard-stats'
import { Location, DataSource, Crop, WeatherData, FirebaseSensorData, AppStep } from '@/lib/types'

const steps: { id: AppStep; label: string; icon: React.ReactNode }[] = [
  { id: 'location', label: 'Məkan', icon: <MapPin className="h-4 w-4" /> },
  { id: 'source', label: 'Data Mənbəyi', icon: <Database className="h-4 w-4" /> },
  { id: 'data', label: 'Məlumatlar', icon: <Cloud className="h-4 w-4" /> },
  { id: 'crop', label: 'Bitki', icon: <Sprout className="h-4 w-4" /> },
  { id: 'dashboard', label: 'Panel', icon: <BarChart3 className="h-4 w-4" /> },
]

export default function SmartFarmingApp() {
  const [currentStep, setCurrentStep] = useState<AppStep>('location')
  const [location, setLocation] = useState<Location | null>(null)
  const [dataSource, setDataSource] = useState<DataSource | null>(null)
  const [firebaseUrl, setFirebaseUrl] = useState<string>('')
  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(null)
  const [forecast, setForecast] = useState<WeatherData[]>([])
  const [sensorData, setSensorData] = useState<FirebaseSensorData | null>(null)
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const currentStepIndex = steps.findIndex(s => s.id === currentStep)

  const canProceed = () => {
    switch (currentStep) {
      case 'location': return location !== null
      case 'source': return dataSource !== null
      case 'data': return currentWeather !== null || sensorData !== null
      case 'crop': return selectedCrop !== null
      default: return true
    }
  }

  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < steps.length && canProceed()) {
      setCurrentStep(steps[nextIndex].id)
    }
  }

  const goToPrevStep = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id)
    }
  }

  const handleLocationSelect = useCallback((loc: Location) => {
    setLocation(loc)
  }, [])

  const handleSourceSelect = useCallback((source: DataSource, fbUrl?: string) => {
    setDataSource(source)
    if (fbUrl) setFirebaseUrl(fbUrl)
  }, [])

  const handleWeatherData = useCallback((current: WeatherData, forecastData: WeatherData[]) => {
    setCurrentWeather(current)
    setForecast(forecastData)
  }, [])

  const handleSensorData = useCallback((data: FirebaseSensorData) => {
    setSensorData(data)
  }, [])

  const handleCropSelect = useCallback((crop: Crop) => {
    setSelectedCrop(crop)
  }, [])

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
              <p className="text-xs text-muted-foreground hidden sm:block">Ağıllı Kənd Təsərrüfatı</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => {
                  if (index <= currentStepIndex || canProceed()) {
                    setCurrentStep(step.id)
                  }
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  currentStep === step.id
                    ? 'bg-primary text-primary-foreground'
                    : index < currentStepIndex
                      ? 'bg-primary/10 text-primary hover:bg-primary/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
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
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          {/* Status Badges */}
          <div className="hidden md:flex items-center gap-2">
            {location && (
              <Badge variant="secondary" className="gap-1">
                <MapPin className="h-3 w-3" />
                {location.address?.split(',')[0]}
              </Badge>
            )}
            {selectedCrop && (
              <Badge variant="secondary" className="gap-1">
                {selectedCrop.icon} {selectedCrop.nameAz}
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Sidebar */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-background/80" onClick={() => setIsSidebarOpen(false)} />
          <div className="absolute left-0 top-16 bottom-0 w-64 bg-card border-r border-border p-4">
            <nav className="space-y-2">
              {steps.map((step, index) => (
                <button
                  key={step.id}
                  onClick={() => {
                    if (index <= currentStepIndex || canProceed()) {
                      setCurrentStep(step.id)
                      setIsSidebarOpen(false)
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                    currentStep === step.id
                      ? 'bg-primary text-primary-foreground'
                      : index < currentStepIndex
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted'
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
            <span>Addım {currentStepIndex + 1} / {steps.length}</span>
            <span>{steps[currentStepIndex].label}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="max-w-4xl mx-auto">
          {currentStep === 'location' && (
            <LocationPicker
              onLocationSelect={handleLocationSelect}
              selectedLocation={location}
            />
          )}

          {currentStep === 'source' && (
            <DataSourceSelector
              onSourceSelect={handleSourceSelect}
              selectedSource={dataSource}
            />
          )}

          {currentStep === 'data' && location && (
            <div className="space-y-6">
              {dataSource === 'weather' && (
                <WeatherDisplay
                  location={location}
                  onWeatherData={handleWeatherData}
                />
              )}
              {dataSource === 'firebase' && firebaseUrl && (
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

          {currentStep === 'crop' && (
            <CropSelector
              onCropSelect={handleCropSelect}
              selectedCrop={selectedCrop}
            />
          )}

          {currentStep === 'dashboard' && selectedCrop && (
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
              onClick={goToNextStep}
              disabled={!canProceed()}
              className="gap-2"
            >
              Davam et
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentStep('location')}
              variant="outline"
              className="gap-2"
            >
              Yenidən başla
            </Button>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Leaf className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">AgriSense</span>
              <span className="text-muted-foreground">- Ağıllı Kənd Təsərrüfatı Platforması</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Canlı hava məlumatları, torpaq analizi və AI tövsiyələri ilə kənd təsərrüfatını optimallaşdırın.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
