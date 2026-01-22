'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus, Droplets, Thermometer, Wind, Sun, Leaf, RefreshCw } from 'lucide-react'
import { WeatherData, FirebaseSensorData, Crop } from '@/lib/types'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { Badge } from '@/components/ui/badge'

// Fixed colors for charts that work in both light and dark mode
const CHART_COLORS = {
  temp: '#f59e0b',
  humidity: '#3b82f6', 
  soil: '#22c55e',
  primary: '#16a34a'
}

interface DashboardStatsProps {
  weather?: WeatherData
  sensorData?: FirebaseSensorData
  forecast?: WeatherData[]
  crop?: Crop
}

export function DashboardStats({ weather, sensorData, forecast, crop }: DashboardStatsProps) {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  
  // Update timestamp when data changes
  useEffect(() => {
    setLastUpdate(new Date())
  }, [weather, sensorData, forecast])

  // Memoize current values to prevent unnecessary recalculations
  const currentTemp = useMemo(() => sensorData?.airTemperature || weather?.temp || 0, [sensorData?.airTemperature, weather?.temp])
  const currentHumidity = useMemo(() => sensorData?.humidity || weather?.humidity || 0, [sensorData?.humidity, weather?.humidity])
  const soilMoisture = useMemo(() => sensorData?.soilMoisture || weather?.soilMoisture || 0, [sensorData?.soilMoisture, weather?.soilMoisture])

  // Calculate trends
  const getTrend = (current: number, optimal: { min: number; max: number }) => {
    if (current < optimal.min) return 'low'
    if (current > optimal.max) return 'high'
    return 'optimal'
  }

  const tempTrend = crop ? getTrend(currentTemp, crop.optimalTemp) : 'optimal'
  const humidityTrend = crop ? getTrend(currentHumidity, crop.optimalHumidity) : 'optimal'

  // Prepare chart data from forecast
  const chartData = forecast?.slice(0, 7).map(day => ({
    date: new Date(day.date).toLocaleDateString('az-AZ', { weekday: 'short' }),
    temp: Math.round(day.temp),
    humidity: day.humidity,
    soilMoisture: day.soilMoisture || 50,
    precipitation: day.precipitation
  })) || []

  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === 'low') return <TrendingDown className="h-4 w-4 text-blue-500" />
    if (trend === 'high') return <TrendingUp className="h-4 w-4 text-orange-500" />
    return <Minus className="h-4 w-4 text-primary" />
  }

  // Calculate overall health score
  const overallHealth = useMemo(() => {
    if (!crop) return 0
    const tempScore = Math.max(0, 100 - Math.abs(currentTemp - (crop.optimalTemp.min + crop.optimalTemp.max) / 2) * 5)
    const humidityScore = Math.max(0, 100 - Math.abs(currentHumidity - (crop.optimalHumidity.min + crop.optimalHumidity.max) / 2) * 2)
    const soilScore = Math.max(0, 100 - Math.abs(soilMoisture - 55) * 2)
    return Math.round((tempScore + humidityScore + soilScore) / 3)
  }, [crop, currentTemp, currentHumidity, soilMoisture])

  return (
    <div className="space-y-6">
      {/* Live Status Bar */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm text-muted-foreground">Canlı məlumatlar</span>
        </div>
        <div className="flex items-center gap-4">
          {crop && (
            <Badge variant={overallHealth >= 70 ? "default" : overallHealth >= 40 ? "secondary" : "destructive"}>
              Ümumi sağlamlıq: {overallHealth}%
            </Badge>
          )}
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <RefreshCw className="h-3 w-3" />
            Son yenilənmə: {lastUpdate.toLocaleTimeString('az-AZ')}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Thermometer className="h-8 w-8 text-orange-500" />
              <TrendIcon trend={tempTrend} />
            </div>
            <p className="text-2xl font-bold mt-2 text-foreground">{currentTemp.toFixed(1)}°C</p>
            <p className="text-sm text-muted-foreground">Temperatur</p>
            {crop && (
              <p className="text-xs text-muted-foreground mt-1">
                Optimal: {crop.optimalTemp.min}-{crop.optimalTemp.max}°C
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Wind className="h-8 w-8 text-blue-400" />
              <TrendIcon trend={humidityTrend} />
            </div>
            <p className="text-2xl font-bold mt-2 text-foreground">{currentHumidity.toFixed(0)}%</p>
            <p className="text-sm text-muted-foreground">Hava Rütubəti</p>
            {crop && (
              <p className="text-xs text-muted-foreground mt-1">
                Optimal: {crop.optimalHumidity.min}-{crop.optimalHumidity.max}%
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Droplets className="h-8 w-8 text-primary" />
              <TrendIcon trend={soilMoisture < 40 ? 'low' : soilMoisture > 70 ? 'high' : 'optimal'} />
            </div>
            <p className="text-2xl font-bold mt-2 text-foreground">{soilMoisture.toFixed(0)}%</p>
            <p className="text-sm text-muted-foreground">Torpaq Nəmliyi</p>
            <p className="text-xs text-muted-foreground mt-1">
              Optimal: 40-70%
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Sun className="h-8 w-8 text-yellow-500" />
              <Leaf className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold mt-2 text-foreground">{weather?.uvIndex?.toFixed(1) || 'N/A'}</p>
            <p className="text-sm text-muted-foreground">UV İndeksi</p>
            <p className="text-xs text-muted-foreground mt-1">
              {(weather?.uvIndex || 0) <= 2 ? 'Aşağı' : (weather?.uvIndex || 0) <= 5 ? 'Orta' : 'Yüksək'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {chartData.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-foreground">Temperatur Proqnozu</CardTitle>
              <CardDescription>7 günlük temperatur dəyişikliyi</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.temp} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={CHART_COLORS.temp} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      className="fill-muted-foreground"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      width={30}
                      className="fill-muted-foreground"
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--color-card)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        color: 'var(--color-foreground)'
                      }}
                      labelStyle={{ color: 'var(--color-foreground)' }}
                      itemStyle={{ color: CHART_COLORS.temp }}
                      formatter={(value: number) => [`${value}°C`, 'Temperatur']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="temp" 
                      stroke={CHART_COLORS.temp}
                      fill="url(#tempGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-foreground">Rütubət və Torpaq Nəmliyi</CardTitle>
              <CardDescription>7 günlük dəyişiklik</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      className="fill-muted-foreground"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      width={30}
                      className="fill-muted-foreground"
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--color-card)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        color: 'var(--color-foreground)'
                      }}
                      labelStyle={{ color: 'var(--color-foreground)' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="humidity" 
                      stroke={CHART_COLORS.humidity}
                      strokeWidth={2}
                      dot={false}
                      name="Rütubət %"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="soilMoisture" 
                      stroke={CHART_COLORS.soil}
                      strokeWidth={2}
                      dot={false}
                      name="Torpaq Nəmliyi %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Crop Health Score */}
      {crop && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-foreground">
              <span className="text-2xl">{crop.icon}</span>
              {crop.nameAz} - Sağlamlıq Xalı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Temperature Score */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Temperatur uyğunluğu</span>
                  <span className="font-medium text-foreground">
                    {Math.max(0, 100 - Math.abs(currentTemp - (crop.optimalTemp.min + crop.optimalTemp.max) / 2) * 5).toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ 
                      width: `${Math.max(0, 100 - Math.abs(currentTemp - (crop.optimalTemp.min + crop.optimalTemp.max) / 2) * 5)}%` 
                    }}
                  />
                </div>
              </div>

              {/* Humidity Score */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Rütubət uyğunluğu</span>
                  <span className="font-medium text-foreground">
                    {Math.max(0, 100 - Math.abs(currentHumidity - (crop.optimalHumidity.min + crop.optimalHumidity.max) / 2) * 2).toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-chart-3 rounded-full transition-all"
                    style={{ 
                      width: `${Math.max(0, 100 - Math.abs(currentHumidity - (crop.optimalHumidity.min + crop.optimalHumidity.max) / 2) * 2)}%` 
                    }}
                  />
                </div>
              </div>

              {/* Soil Moisture Score */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Torpaq nəmliyi uyğunluğu</span>
                  <span className="font-medium text-foreground">
                    {Math.max(0, 100 - Math.abs(soilMoisture - 55) * 2).toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-chart-2 rounded-full transition-all"
                    style={{ 
                      width: `${Math.max(0, 100 - Math.abs(soilMoisture - 55) * 2)}%` 
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
