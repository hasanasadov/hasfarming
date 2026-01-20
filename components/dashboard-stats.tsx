'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus, Droplets, Thermometer, Wind, Sun, Leaf } from 'lucide-react'
import { WeatherData, FirebaseSensorData, Crop } from '@/lib/types'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'

interface DashboardStatsProps {
  weather?: WeatherData
  sensorData?: FirebaseSensorData
  forecast?: WeatherData[]
  crop?: Crop
}

export function DashboardStats({ weather, sensorData, forecast, crop }: DashboardStatsProps) {
  const currentTemp = sensorData?.airTemperature || weather?.temp || 0
  const currentHumidity = sensorData?.humidity || weather?.humidity || 0
  const soilMoisture = sensorData?.soilMoisture || weather?.soilMoisture || 0

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

  return (
    <div className="space-y-6">
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
                        <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      width={30}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))'
                      }}
                      formatter={(value: number) => [`${value}°C`, 'Temperatur']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="temp" 
                      stroke="hsl(var(--chart-4))"
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
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      width={30}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="humidity" 
                      stroke="hsl(var(--chart-3))"
                      strokeWidth={2}
                      dot={false}
                      name="Rütubət %"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="soilMoisture" 
                      stroke="hsl(var(--primary))"
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
