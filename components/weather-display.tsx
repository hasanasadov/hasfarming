'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Cloud, Droplets, Wind, Sun, Thermometer, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Location, WeatherData } from '@/lib/types'

interface WeatherDisplayProps {
  location: Location
  onWeatherData: (current: WeatherData, forecast: WeatherData[]) => void
}

export function WeatherDisplay({ location, onWeatherData }: WeatherDisplayProps) {
  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(null)
  const [forecast, setForecast] = useState<WeatherData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchWeather = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/weather?lat=${location.lat}&lng=${location.lng}`)
      
      if (!response.ok) {
        throw new Error('Hava məlumatları alına bilmədi')
      }

      const data = await response.json()
      
      const current: WeatherData = {
        date: new Date().toISOString().split('T')[0],
        temp: data.current.temp,
        tempMin: data.forecast[0]?.tempMin || data.current.temp - 5,
        tempMax: data.forecast[0]?.tempMax || data.current.temp + 5,
        humidity: data.current.humidity,
        precipitation: data.current.precipitation,
        windSpeed: data.current.windSpeed,
        description: data.current.description,
        icon: data.current.icon,
        soilMoisture: data.forecast[0]?.soilMoisture || 50,
        uvIndex: data.current.uvIndex
      }

      setCurrentWeather(current)
      setForecast(data.forecast)
      setLastUpdate(new Date())
      onWeatherData(current, data.forecast)
    } catch (err) {
      console.error('Weather fetch error:', err)
      setError('Hava məlumatları yüklənə bilmədi')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchWeather()
    
    // Refresh every 10 minutes
    const interval = setInterval(fetchWeather, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [location.lat, location.lng])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const days = ['Baz', 'B.e', 'Ç.a', 'Ç', 'C.a', 'C', 'Ş']
    return days[date.getDay()]
  }

  if (isLoading && !currentWeather) {
    return (
      <Card className="border-border/50 shadow-lg">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive/50 shadow-lg">
        <CardContent className="py-6">
          <div className="text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchWeather} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Yenidən cəhd et
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Cloud className="h-5 w-5 text-primary" />
              Cari Hava Şəraiti
            </CardTitle>
            <CardDescription>
              {location.address}
              {lastUpdate && (
                <span className="ml-2 text-xs">
                  (Yeniləndi: {lastUpdate.toLocaleTimeString('az-AZ')})
                </span>
              )}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchWeather} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {currentWeather && (
          <>
            {/* Current Weather */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/10">
              <div className="flex items-center gap-4">
                <span className="text-5xl">{currentWeather.icon}</span>
                <div>
                  <p className="text-4xl font-bold text-foreground">{Math.round(currentWeather.temp)}°C</p>
                  <p className="text-muted-foreground">{currentWeather.description}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-accent" />
                  <span className="text-muted-foreground">
                    {Math.round(currentWeather.tempMin)}° / {Math.round(currentWeather.tempMax)}°
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">{currentWeather.humidity}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Wind className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{Math.round(currentWeather.windSpeed)} km/s</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sun className="h-4 w-4 text-accent" />
                  <span className="text-muted-foreground">UV: {currentWeather.uvIndex?.toFixed(1) || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* 7-Day Forecast */}
            <div>
              <h3 className="font-semibold text-foreground mb-3">7 Günlük Proqnoz</h3>
              <div className="grid grid-cols-7 gap-2">
                {forecast.map((day, index) => (
                  <div
                    key={day.date}
                    className={`text-center p-3 rounded-lg border transition-colors ${
                      index === 0 
                        ? 'bg-primary/10 border-primary/30' 
                        : 'bg-card border-border hover:border-primary/30'
                    }`}
                  >
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {index === 0 ? 'Bu gün' : formatDate(day.date)}
                    </p>
                    <span className="text-2xl block my-1">{day.icon}</span>
                    <p className="text-sm font-bold text-foreground">{Math.round(day.tempMax)}°</p>
                    <p className="text-xs text-muted-foreground">{Math.round(day.tempMin)}°</p>
                    <div className="mt-1 flex items-center justify-center gap-1">
                      <Droplets className="h-3 w-3 text-primary" />
                      <span className="text-xs text-muted-foreground">{Math.round(day.soilMoisture || 0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
